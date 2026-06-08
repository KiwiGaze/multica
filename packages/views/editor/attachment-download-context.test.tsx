import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Attachment } from "@multica/core/types";
import {
  AttachmentDownloadProvider,
  useAttachmentDownloadResolver,
} from "./attachment-download-context";

const { downloadMock, openExternalMock } = vi.hoisted(() => ({
  downloadMock: vi.fn(),
  openExternalMock: vi.fn(),
}));

vi.mock("./use-download-attachment", () => ({
  useDownloadAttachment: () => downloadMock,
}));

vi.mock("../platform", () => ({
  openExternal: openExternalMock,
}));

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "att-1",
    workspace_id: "ws-1",
    issue_id: null,
    comment_id: null,
    chat_session_id: null,
    chat_message_id: null,
    uploader_type: "member",
    uploader_id: "user-1",
    filename: "shot.png",
    url: "/uploads/workspaces/ws-1/att-1.png",
    download_url: "/api/attachments/att-1/download",
    content_type: "image/png",
    size_bytes: 123,
    created_at: "2026-06-08T00:00:00Z",
    ...overrides,
  };
}

function Probe({ label, url }: { label: string; url: string }) {
  const resolver = useAttachmentDownloadResolver();
  const record = resolver.resolveAttachment(url);
  return (
    <section>
      <div data-testid={`${label}-id`}>
        {resolver.resolveAttachmentId(url) ?? "none"}
      </div>
      <div data-testid={`${label}-filename`}>{record?.filename ?? "none"}</div>
      <button type="button" onClick={() => resolver.openByUrl(url)}>
        open {label}
      </button>
    </section>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AttachmentDownloadProvider", () => {
  it("resolves both raw storage URLs and download URLs to the same attachment", () => {
    const attachment = makeAttachment();

    render(
      <AttachmentDownloadProvider attachments={[attachment]}>
        <Probe label="raw" url={attachment.url} />
        <Probe label="download" url={attachment.download_url} />
      </AttachmentDownloadProvider>,
    );

    expect(screen.getByTestId("raw-id")).toHaveTextContent("att-1");
    expect(screen.getByTestId("raw-filename")).toHaveTextContent("shot.png");
    expect(screen.getByTestId("download-id")).toHaveTextContent("att-1");
    expect(screen.getByTestId("download-filename")).toHaveTextContent("shot.png");

    fireEvent.click(screen.getByRole("button", { name: "open raw" }));
    fireEvent.click(screen.getByRole("button", { name: "open download" }));

    expect(downloadMock).toHaveBeenCalledTimes(2);
    expect(downloadMock).toHaveBeenNthCalledWith(1, "att-1");
    expect(downloadMock).toHaveBeenNthCalledWith(2, "att-1");
    expect(openExternalMock).not.toHaveBeenCalled();
  });

  it("falls back to opening external URLs when no attachment matches", () => {
    render(
      <AttachmentDownloadProvider attachments={[makeAttachment()]}>
        <Probe label="external" url="https://example.test/outside.png" />
      </AttachmentDownloadProvider>,
    );

    expect(screen.getByTestId("external-id")).toHaveTextContent("none");
    expect(screen.getByTestId("external-filename")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "open external" }));

    expect(downloadMock).not.toHaveBeenCalled();
    expect(openExternalMock).toHaveBeenCalledWith("https://example.test/outside.png");
  });
});
