import { z } from "zod";

const USING = [
  "urn:ietf:params:jmap:core",
  "urn:ietf:params:jmap:mail",
  "urn:ietf:params:jmap:submission",
];
const TIMEOUT_MS = 30_000;

type Call = [method: string, args: Record<string, unknown>, tag: string];
type MethodResponse = [name: string, args: Record<string, unknown>, tag: string];

const sessionSchema = z.object({ primaryAccounts: z.record(z.string(), z.string()) });
const methodResponsesSchema = z.object({
  methodResponses: z.array(z.tuple([z.string(), z.record(z.string(), z.unknown()), z.string()])),
});
const methodErrorSchema = z.object({ type: z.string(), description: z.string().optional() });
const uploadSchema = z.object({ blobId: z.string() });
const mailboxesSchema = z.object({
  list: z.array(z.object({ id: z.string(), role: z.string().nullable() })),
});
const identitiesSchema = z.object({
  list: z.array(z.object({ id: z.string(), email: z.string() })),
});
const setResultSchema = z.object({
  created: z.record(z.string(), z.object({ id: z.string() })).nullish(),
  notCreated: z.record(z.string(), methodErrorSchema).nullish(),
});

type Account = { accountId: string; draftsId: string; identityId: string };

/** Fastmail may have sent the email: the request went out, but no clear answer came back. */
export class MaybeSentError extends Error {}

/** Sends ready-made emails from one of the account's addresses through Fastmail's JMAP API. */
export class FastmailSender {
  private account: Promise<Account> | undefined;

  constructor(
    private readonly baseUrl: string,
    private readonly fromEmail: string,
  ) {}

  async send(message: Buffer) {
    const { accountId, draftsId, identityId } = await this.loadAccount();
    const blobId = await this.upload(accountId, message);
    const [imported, submitted] = await this.submit([
      [
        "Email/import",
        {
          accountId,
          emails: {
            invite: {
              blobId,
              mailboxIds: { [draftsId]: true },
              keywords: { $draft: true, $seen: true },
            },
          },
        },
        "import",
      ],
      [
        "EmailSubmission/set",
        {
          accountId,
          create: { send: { identityId, emailId: "#invite" } },
          onSuccessDestroyEmail: ["#send"],
        },
        "submit",
      ],
    ]);
    if (createdId(submitted, "send")) return;

    const draftId = createdId(imported, "invite");
    if (!draftId) throw new Error(`Fastmail didn't take it: ${failureOf(imported, "invite")}`);
    await this.request([["Email/set", { accountId, destroy: [draftId] }, "discard"]]);
    throw new Error(`Fastmail didn't send it: ${failureOf(submitted, "send")}`);
  }

  private loadAccount() {
    this.account ??= this.findAccount().catch((error: unknown) => {
      this.account = undefined;
      throw error;
    });
    return this.account;
  }

  private async findAccount(): Promise<Account> {
    const response = await fetch(`${this.baseUrl}/jmap/session`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`JMAP session answered ${response.status}`);
    const session = sessionSchema.parse(await response.json());
    const accountId = session.primaryAccounts["urn:ietf:params:jmap:submission"];
    if (!accountId) throw new Error("The Fastmail token can't send email");

    const [mailboxes, identities] = await this.request([
      ["Mailbox/get", { accountId, properties: ["role"] }, "mailboxes"],
      ["Identity/get", { accountId, properties: ["email"] }, "identities"],
    ]);
    const drafts = mailboxesSchema.parse(mailboxes).list.find((each) => each.role === "drafts");
    if (!drafts) throw new Error("Fastmail has no Drafts mailbox");
    const identity = identitiesSchema
      .parse(identities)
      .list.find((each) => each.email.toLowerCase() === this.fromEmail.toLowerCase());
    if (!identity) throw new Error(`Fastmail has no identity for ${this.fromEmail}`);
    return { accountId, draftsId: drafts.id, identityId: identity.id };
  }

  private async upload(accountId: string, message: Buffer) {
    const response = await fetch(`${this.baseUrl}/jmap/upload/${accountId}/`, {
      method: "POST",
      headers: { "content-type": "message/rfc822" },
      body: new Uint8Array(message),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`JMAP upload answered ${response.status}`);
    return uploadSchema.parse(await response.json()).blobId;
  }

  /** Like `request`, but tells apart a request Fastmail refused from one whose outcome is unknown. */
  private async submit(calls: Call[]): Promise<MethodResponse[]> {
    let response: Response;
    try {
      response = await this.post(calls);
    } catch (error) {
      throw new MaybeSentError("No answer from Fastmail", { cause: error });
    }
    if (response.status >= 500) throw new MaybeSentError(`JMAP answered ${response.status}`);
    if (!response.ok) throw new Error(`JMAP answered ${response.status}`);
    try {
      return methodResponsesSchema.parse(await response.json()).methodResponses;
    } catch (error) {
      throw new MaybeSentError("Unreadable answer from Fastmail", { cause: error });
    }
  }

  private async request(calls: Call[]) {
    const response = await this.post(calls);
    if (!response.ok) throw new Error(`JMAP answered ${response.status}`);
    const { methodResponses } = methodResponsesSchema.parse(await response.json());
    return methodResponses.map(([name, args]) => {
      if (name !== "error") return args;
      const error = methodErrorSchema.parse(args);
      throw new Error(`JMAP: ${error.description ?? error.type}`);
    });
  }

  private post(calls: Call[]) {
    return fetch(`${this.baseUrl}/jmap/api/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ using: USING, methodCalls: calls }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }
}

function createdId(response: MethodResponse | undefined, creationId: string) {
  if (!response || response[0] === "error") return undefined;
  return setResultSchema.safeParse(response[1]).data?.created?.[creationId]?.id;
}

function failureOf(response: MethodResponse | undefined, creationId: string) {
  if (!response) return "no answer";
  const [name, args] = response;
  let error = setResultSchema.safeParse(args).data?.notCreated?.[creationId];
  if (name === "error") error = methodErrorSchema.safeParse(args).data;
  return error?.description ?? error?.type ?? "no reason given";
}
