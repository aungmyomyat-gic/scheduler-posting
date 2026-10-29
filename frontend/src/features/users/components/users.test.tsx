import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import fixtures from "../../../../../docs/contract-fixtures.json";
import { CreateUserForm } from "./user-form";
import { UsersList } from "./users-list";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function listBody(users = [fixtures.user]) {
  return {
    success: true,
    message: "Users retrieved.",
    data: users,
    meta: {
      requestId: "test",
      pagination: { page: 1, pageSize: 10, total: users.length, totalPages: users.length ? 1 : 0 },
    },
  };
}
beforeEach(() => {
  push.mockReset();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
});

describe("users interface", () => {
  it("renders loading followed by the real list response", async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<UsersList query={{ q: "", page: 1, pageSize: 10 }} deleted={false} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByLabelText("Loading content")).toBeInTheDocument();
    finish(Response.json(listBody()));
    expect(await screen.findByRole("link", { name: "Alex Morgan" })).toBeInTheDocument();
    expect(screen.getAllByText("alex@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
  it("shows an empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(listBody([]))));
    render(<UsersList query={{ q: "", page: 1, pageSize: 10 }} deleted={false} />, {
      wrapper: Wrapper,
    });
    expect(await screen.findByText("Your first user starts here")).toBeInTheDocument();
  });
  it("shows a retryable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<UsersList query={{ q: "", page: 1, pageSize: 10 }} deleted={false} />, {
      wrapper: Wrapper,
    });
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Cannot reach the API");
  });
  it("submits search into the URL and resets pagination", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(listBody())));
    const user = userEvent.setup();
    render(<UsersList query={{ q: "", page: 1, pageSize: 10 }} deleted={false} />, {
      wrapper: Wrapper,
    });
    await user.type(screen.getByLabelText("Search users"), "Jamie");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenCalledWith("/users?q=Jamie&page=1&pageSize=10");
  });
  it("validates forms before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CreateUserForm />, { wrapper: Wrapper });
    await user.type(screen.getByLabelText("Display name"), "A");
    await user.type(screen.getByLabelText("Email address"), "bad");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByText("Use at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("maps duplicate-email errors onto the form and preserves the draft", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            success: false,
            message: "A user with this email already exists.",
            error: {
              code: "CONFLICT",
              fieldErrors: { email: ["This email is already in use."] },
            },
            meta: { requestId: "test" },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CreateUserForm />, { wrapper: Wrapper });
    await user.type(screen.getByLabelText("Display name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByText("This email is already in use.")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Alex Morgan");
    expect(screen.getByLabelText("Email address")).toHaveValue("alex@example.com");
    expect(push).not.toHaveBeenCalled();
  });
  it("creates a user and navigates to its detail page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            success: true,
            message: "User created.",
            data: fixtures.user,
            meta: { requestId: "test" },
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CreateUserForm />, { wrapper: Wrapper });
    await user.type(screen.getByLabelText("Display name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/users/${fixtures.user.id}?notice=created`),
    );
  });
});
