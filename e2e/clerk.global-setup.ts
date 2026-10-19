import { clerkSetup } from "@clerk/testing/playwright";

/** Runs once in the main process: fetches a Clerk testing token that every worker inherits. */
export default async function globalSetup() {
  await clerkSetup();
}
