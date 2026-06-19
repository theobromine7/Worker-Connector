import { useState } from "react";
import { useLocation } from "wouter";
import { useRegisterWorker, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ArrowRight, ChevronLeft } from "lucide-react";
import { SKILL_CATEGORIES } from "@/lib/constants";
import { Link } from "wouter";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    skill: "",
    upiId: "",
  });

  const sendOtp = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        setStep("otp");
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
      onSuccess: () => {
        registerWorker.mutate({ data: form });
      },
      onError: () => {
        toast({ title: "Invalid OTP", variant: "destructive" });
      },
    },
  });

  const registerWorker = useRegisterWorker({
    mutation: {
      onSuccess: () => {
        toast({ title: "Registration successful! Please login." });
        setLocation("/login");
      },
      onError: () => {
        toast({ title: "Registration failed. Phone may already be registered.", variant: "destructive" });
      },
    },
  });

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.city || !form.skill) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    sendOtp.mutate({ data: { phone: form.phone } });
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    verifyOtp.mutate({ data: { phone: form.phone, otp } });
  }

  const isPending = sendOtp.isPending || verifyOtp.isPending || registerWorker.isPending;

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
              {step === "form" ? "Create your account" : "Verify your number"}
            </CardTitle>
            <CardDescription>
              {step === "form"
                ? "Fill in your details to register as a worker"
                : `Enter the OTP sent to ${form.phone}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "form" ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Rajesh Kumar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="input-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    data-testid="input-phone"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    data-testid="input-city"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill">Skill Category <span className="text-destructive">*</span></Label>
                  <Select value={form.skill} onValueChange={(v) => setForm({ ...form, skill: v })}>
                    <SelectTrigger data-testid="select-skill">
                      <SelectValue placeholder="Select your skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="upiId"
                    placeholder="name@upi"
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    data-testid="input-upi"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isPending}
                  data-testid="button-register-submit"
                >
                  {isPending ? "Sending OTP..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                {devOtp && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm dark:bg-amber-950/30 dark:border-amber-800">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Dev OTP:</span>
                    <span className="font-mono font-bold tracking-widest text-amber-700 dark:text-amber-300">{devOtp}</span>
                    <span className="text-amber-500 text-xs ml-auto">(pre-filled)</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp">One-Time Password</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="text-center tracking-widest text-lg"
                    maxLength={6}
                    data-testid="input-otp"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isPending}
                  data-testid="button-verify-otp"
                >
                  {isPending ? "Verifying..." : "Verify & Register"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm gap-2"
                  onClick={() => { setStep("form"); setOtp(""); }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center w-full">
              Already registered?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
