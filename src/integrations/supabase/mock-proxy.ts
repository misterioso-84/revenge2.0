import { createServerFn } from "@tanstack/react-start";

export const mockDbProxy = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: any }) => {
    try {
      const { queryMockDb } = await import("./mock-db.server");
      return await queryMockDb(data);
    } catch (e: any) {
      console.error("Error in mockDbProxy:", e);
      return { data: null, error: { message: e.message } };
    }
  },
);

export const mockAuthProxy = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: any }) => {
    try {
      const { handleMockAuth } = await import("./mock-db.server");
      return await handleMockAuth(data);
    } catch (e: any) {
      console.error("Error in mockAuthProxy:", e);
      return { data: null, error: { message: e.message } };
    }
  },
);
