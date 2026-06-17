import { Link } from "@tanstack/react-router";
import { ShieldAlert, LogIn } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export function RoleGate({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const { loading, userId, roles } = useAuth();

  if (loading) {
    return (
      <div className="px-4 min-h-[60vh] grid place-items-center">
        <div className="glass rounded-3xl p-8 animate-pulse text-sm text-muted-foreground">
          Establishing secure link…
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <Center
        icon={<LogIn className="size-6" />}
        title="Sign in required"
        body="This area requires an authenticated session."
        cta={{ to: "/auth", label: "Sign in" }}
      />
    );
  }

  if (!roles.includes(role)) {
    return (
      <Center
        icon={<ShieldAlert className="size-6 text-rose-400" />}
        title={`${role[0].toUpperCase()}${role.slice(1)} access required`}
        body={
          role === "admin"
            ? "Your account is not provisioned for the admin control center."
            : role === "seller"
              ? "Apply to become a seller from your account to publish products."
              : "You don't have the required role."
        }
        cta={{ to: "/dashboard", label: "Back to account" }}
      />
    );
  }

  return <>{children}</>;
}

function Center({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="px-4 min-h-[70vh] grid place-items-center">
      <div className="glass-strong rounded-3xl p-10 max-w-md text-center relative overflow-hidden">
        <div className="absolute -inset-10 bg-aurora opacity-20 blur-3xl -z-10 animate-aurora" />
        <div className="size-12 rounded-2xl glass grid place-items-center mx-auto mb-4">
          {icon}
        </div>
        <h2 className="text-2xl font-extrabold tracking-tighter">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{body}</p>
        <Link
          to={cta.to}
          className="inline-flex mt-6 items-center gap-2 rounded-full bg-aurora animate-aurora px-5 py-2 text-sm font-bold text-background"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}
