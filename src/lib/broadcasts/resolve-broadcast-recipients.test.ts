import { describe, expect, it } from "vitest";
import {
  resolveBroadcastRecipients,
  type BroadcastRecipientResolverStore,
} from "./resolve-broadcast-recipients";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const userC = "33333333-3333-4333-8333-333333333333";
const projectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const segmentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("resolveBroadcastRecipients", () => {
  it("deduplicates selected users and excludes invalid ids", async () => {
    const recipients = await resolveBroadcastRecipients(
      {
        targetType: "selected_users",
        targetPayload: {
          userIds: [userA, "not-a-uuid", userA, userB, null],
        },
      },
      { store: createResolverStore() }
    );

    expect(recipients).toEqual([userA, userB]);
  });

  it("resolves project members from project conversations", async () => {
    const recipients = await resolveBroadcastRecipients(
      {
        targetType: "project_members",
        targetPayload: {
          projectId,
        },
      },
      { store: createResolverStore() }
    );

    expect(recipients).toEqual([userA, userC]);
  });

  it("resolves segment members and requires confirmation for all users", async () => {
    const store = createResolverStore();

    await expect(
      resolveBroadcastRecipients(
        {
          targetType: "all_users",
          targetPayload: {},
        },
        { store }
      )
    ).rejects.toThrow("confirmAllUsers");

    await expect(
      resolveBroadcastRecipients(
        {
          targetType: "all_users",
          targetPayload: {
            confirmAllUsers: true,
          },
        },
        { store }
      )
    ).resolves.toEqual([userA, userB, userC]);

    await expect(
      resolveBroadcastRecipients(
        {
          targetType: "segment",
          targetPayload: {
            segmentId,
          },
        },
        { store }
      )
    ).resolves.toEqual([userB, userC]);
  });
});

function createResolverStore(): BroadcastRecipientResolverStore {
  return {
    async getProjectMemberUserIds(nextProjectId) {
      return nextProjectId === projectId ? [userA, userA, userC] : [];
    },
    async getSegmentMemberUserIds(nextSegmentId) {
      return nextSegmentId === segmentId ? [userB, userC] : [];
    },
    async getAllUserIds() {
      return [userA, userB, userC];
    },
  };
}
