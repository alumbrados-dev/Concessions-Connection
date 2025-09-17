import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await login(email);
      toast({
        title: "Welcome to Concessions Connection!",
        description: "You've been successfully logged in.",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-accent rounded-full mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-truck text-3xl text-accent-foreground"></i>
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Concessions Connection</h1>
            <p className="text-muted-foreground">...Linking families through tastes and experiences!</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" data-testid="label-email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-email"
                className="px-4 py-3 rounded-xl"
              />
            </div>
            <Button 
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 rounded-xl font-medium"
              data-testid="button-submit"
            >
              {isLoading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            We'll send you a secure link to sign in
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
