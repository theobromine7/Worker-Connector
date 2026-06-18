import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ArrowRight, User, Lock } from "lucide-react";
import { Link } from "wouter";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("workerconnect_token", data.token);
        localStorage.setItem("workerconnect_role", data.role);
        setLocation("/admin/dashboard");
      },
      onError: () => {
        toast({ title: "Invalid credentials", variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ data: { username, password } });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">WorkerConnect</h1>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
          </div>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>Enter your admin credentials to access the dashboard</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    data-testid="input-username"
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
                    placeholder="••••••••"
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
                disabled={login.isPending}
                data-testid="button-admin-login"
              >
                {login.isPending ? "Signing in..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center w-full">
              Worker?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
