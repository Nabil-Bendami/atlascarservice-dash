import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.info("[login] submitting owner login", { email: email.trim().toLowerCase() });
      const profile = await authService.signIn(email, password);
      if (profile.role !== "super_owner" && profile.role !== "agency") {
        throw new Error(`Access denied. Unsupported role: ${profile.role}.`);
      }
      const ownerTarget = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";
      const target = profile.role === "super_owner" ? ownerTarget : authService.getDefaultRedirectTarget(profile);
      navigate(target, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to login";
      console.error("[login] owner login failed", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(91,95,239,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_18%)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm uppercase tracking-[0.35em] text-primary">Private access</p>
          <CardTitle className="text-3xl text-slate-900">Owner login</CardTitle>
          <CardDescription>Super owners and agency accounts can sign in. Each role is redirected to its own access path.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Enter owner dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
