import { createServerFn } from "@tanstack/react-start";
import { queryMockDb, handleMockAuth } from "./mock-db.server";

export const mockDbProxy = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: any }) => {
    try {
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
      return await handleMockAuth(data);
    } catch (e: any) {
      console.error("Error in mockAuthProxy:", e);
      return { data: null, error: { message: e.message } };
    }
  },
);
