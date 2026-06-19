import { useState } from "react";
import { useLocation } from "wouter";
import { useWorkerLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ArrowRight, Phone, Lock } from "lucide-react";
import { Link } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const workerLogin = useWorkerLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("workerconnect_token", data.token);
        localStorage.setItem("workerconnect_role", data.role);
        if (data.workerId) {
          localStorage.setItem("workerconnect_worker_id", String(data.workerId));
        }
        setLocation("/worker/dashboard");
      },
      onError: (error) => {
        const msg = (error?.data as { error?: string } | null)?.error ?? error?.message ?? "Login failed";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !password) return;
    workerLogin.mutate({ data: { phone: phone.trim(), password } });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">WorkerConnect</h1>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>Enter your mobile number and password to continue</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    data-testid="input-phone"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    data-testid="input-password"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={workerLogin.isPending}
                data-testid="button-login"
              >
                {workerLogin.isPending ? "Signing in..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              New worker?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                Register here
              </Link>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/admin/login" className="text-muted-foreground hover:text-primary text-xs" data-testid="link-admin-login">
                Admin? Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
