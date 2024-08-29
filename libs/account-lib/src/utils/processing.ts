export namespace ProcessingUtils {
  export const MAX_WAIT_FOR_GRACE_FULL_SHUTDOWN_MS = 6 * 1000;
  export const DELAY_TO_CHECK_FOR_SHUTDOWN_MS = 300;
  export async function delay(ms): Promise<any> {
    // eslint-disable-next-line no-promise-executor-return
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
