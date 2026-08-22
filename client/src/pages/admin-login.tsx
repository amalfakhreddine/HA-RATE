import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, User } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Authentication Failed",
          description: "Invalid credentials. Please check your username and password.",
          variant: "destructive",
        });
        return;
      }

      // Success - redirect to admin panel
      toast({
        title: "Login Successful",
        description: "Redirecting to admin panel...",
      });

      setTimeout(() => {
        setLocation('/admin/dashboard');
      }, 500);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
            Admin Portal
          </h1>
          <p className="text-slate-400">
            HA-RATE Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8 shadow-xl border-2 bg-slate-900 border-slate-800">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base flex items-center gap-2 text-slate-200">
                <div className="bg-primary/20 p-1 rounded">
                  <User className="w-4 h-4 text-primary" />
                </div>
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                disabled={isLoading}
                data-testid="input-username"
                className="h-11 bg-slate-800 border-slate-700 text-white"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base flex items-center gap-2 text-slate-200">
                <div className="bg-primary/20 p-1 rounded">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                data-testid="input-password"
                className="h-11 bg-slate-800 border-slate-700 text-white"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
              data-testid="button-login"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Shield className="w-4 h-4" />
              <span>Secure Admin Access</span>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
