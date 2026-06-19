import { useState } from "react";
import { useLocation } from "wouter";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
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
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const sendOtp = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        setStep("otp");
        // Dev mode: extract OTP from response message
        const match = data.message?.match(/Dev mode: (\d{6})/);
        if (match) {
          setDevOtp(match[1]);
          setOtp(match[1]);
        }
        toast({ title: "OTP sent" });
      },
      onError: () => {
        toast({ title: "Failed to send OTP", variant: "destructive" });
      },
    },
  });

  const verifyOtp = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("workerconnect_token", data.token);
        localStorage.setItem("workerconnect_role", data.role);
        if (data.workerId) {
          localStorage.setItem("workerconnect_worker_id", String(data.workerId));
        }
        if (data.role === "admin") {
          setLocation("/admin/dashboard");
        } else {
          setLocation("/worker/dashboard");
        }
      },
      onError: () => {
        toast({ title: "Invalid OTP. Please try again.", variant: "destructive" });
      },
    },
  });

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    sendOtp.mutate({ data: { phone: phone.trim() } });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    verifyOtp.mutate({ data: { phone: phone.trim(), otp: otp.trim() } });
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
            <CardTitle className="text-xl">
              {step === "phone" ? "Sign in to your account" : "Verify your number"}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "Enter your registered mobile number to receive an OTP"
                : `Enter the 6-digit OTP sent to ${phone}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
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
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={sendOtp.isPending}
                  data-testid="button-send-otp"
                >
                  {sendOtp.isPending ? "Sending..." : "Send OTP"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {devOtp && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm dark:bg-amber-950/30 dark:border-amber-800">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Dev OTP:</span>
                    <span className="font-mono font-bold tracking-widest text-amber-700 dark:text-amber-300">{devOtp}</span>
                    <span className="text-amber-500 text-xs ml-auto">(pre-filled)</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp">One-Time Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="pl-10 text-center tracking-widest text-lg"
                      maxLength={6}
                      data-testid="input-otp"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={verifyOtp.isPending}
                  data-testid="button-verify-otp"
                >
                  {verifyOtp.isPending ? "Verifying..." : "Verify & Login"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => { setStep("phone"); setOtp(""); }}
                >
                  Change number
                </Button>
              </form>
            )}
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
