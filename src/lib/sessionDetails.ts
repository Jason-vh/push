import { z } from "zod";
import { BOOKING_DURATIONS, START_TIME_PATTERN } from "@/lib/keenDays";

export const startTimeSchema = z.string().regex(START_TIME_PATTERN, "Pick a start time.");

export const durationSchema = z
  .number()
  .int()
  .refine((value) => BOOKING_DURATIONS.some((duration) => duration === value), "Pick a length.");

export const courtSchema = z.string().trim().max(40).nullable();
