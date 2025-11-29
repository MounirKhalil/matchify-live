import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  familyName: z.string().trim().min(1, "Family name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(['job_seeker', 'recruiter'], { required_error: "Please select a role" }),
  organizationName: z.string().trim().max(200).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'recruiter' && !data.organizationName?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Organization name is required for recruiters",
  path: ["organizationName"],
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signUp, signIn, resetPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sign up form state
  const [signUpData, setSignUpData] = useState({
    name: "",
    familyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "job_seeker" as 'job_seeker' | 'recruiter',
    organizationName: "",
  });

  // Sign in form state
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const [resetEmail, setResetEmail] = useState("");

  // Navigation is now handled by the signIn function based on user role

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validated = signUpSchema.parse(signUpData);
      const result = await signUp(
        validated.email, 
        validated.password, 
        validated.name, 
        validated.familyName, 
        validated.role,
        validated.organizationName
      );
      
      if (result?.success) {
        setSignupEmail(validated.email);
        setShowEmailConfirmation(true);
      } else if (result?.error) {
        // Handle duplicate email or other Supabase errors
        if (result.error.includes('already registered') || result.error.includes('already been registered')) {
          setErrors({ email: "This email is already registered. Please sign in instead." });
        } else {
          setErrors({ email: result.error });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validated = signInSchema.parse(signInData);
      await signIn(validated.email, validated.password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await resetPassword(resetEmail);
    setIsSubmitting(false);
    setShowForgotPassword(false);
    setResetEmail("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Matchify
            </h1>
          </Link>
        </div>
      </header>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {showEmailConfirmation ? (
            <Card className="shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
                <CardDescription className="text-base">
                  We've sent a confirmation link to
                  <div className="font-semibold text-foreground mt-2">{signupEmail}</div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <p className="font-medium">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Open your email inbox</li>
                    <li>Click the confirmation link in the email</li>
                    <li>Return here to sign in</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowEmailConfirmation(false);
                    setSignupEmail("");
                  }}
                >
                  Back to Sign In
                </Button>
              </CardContent>
            </Card>
          ) : showForgotPassword ? (
            <Card className="shadow-lg">
              <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email to receive a password reset link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="hero"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <CardHeader className="text-center space-y-2">
                <CardTitle className="text-3xl font-bold">Welcome to Matchify</CardTitle>
                <CardDescription className="text-base">
                  Sign in or create an account to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Sign In / Sign Up Tabs */}
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  {/* Sign In Form */}
                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="you@example.com"
                          value={signInData.email}
                          onChange={(e) =>
                            setSignInData({ ...signInData, email: e.target.value })
                          }
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={signInData.password}
                          onChange={(e) =>
                            setSignInData({ ...signInData, password: e.target.value })
                          }
                        />
                        {errors.password && (
                          <p className="text-sm text-destructive">{errors.password}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-end text-sm">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Button
                        type="submit"
                        variant="hero"
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Sign Up Form */}
                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      {/* Role Selection */}
                      <div className="space-y-2">
                        <Label>I am a</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setSignUpData({ ...signUpData, role: 'job_seeker' })}
                            className={`p-4 border-2 rounded-lg transition-all ${
                              signUpData.role === 'job_seeker'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="font-semibold">Job Seeker</div>
                            <div className="text-xs text-muted-foreground">Looking for opportunities</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignUpData({ ...signUpData, role: 'recruiter' })}
                            className={`p-4 border-2 rounded-lg transition-all ${
                              signUpData.role === 'recruiter'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="font-semibold">Recruiter</div>
                            <div className="text-xs text-muted-foreground">Hiring talent</div>
                          </button>
                        </div>
                        {errors.role && (
                          <p className="text-sm text-destructive">{errors.role}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">First Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John"
                            value={signUpData.name}
                            onChange={(e) =>
                              setSignUpData({ ...signUpData, name: e.target.value })
                            }
                          />
                          {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-family-name">Last Name</Label>
                          <Input
                            id="signup-family-name"
                            type="text"
                            placeholder="Doe"
                            value={signUpData.familyName}
                            onChange={(e) =>
                              setSignUpData({ ...signUpData, familyName: e.target.value })
                            }
                          />
                          {errors.familyName && (
                            <p className="text-sm text-destructive">{errors.familyName}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Organization Name - Only for Recruiters */}
                      {signUpData.role === 'recruiter' && (
                        <div className="space-y-2">
                          <Label htmlFor="signup-organization">Organization Name</Label>
                          <Input
                            id="signup-organization"
                            type="text"
                            placeholder="Acme Inc."
                            value={signUpData.organizationName}
                            onChange={(e) =>
                              setSignUpData({ ...signUpData, organizationName: e.target.value })
                            }
                          />
                          {errors.organizationName && (
                            <p className="text-sm text-destructive">{errors.organizationName}</p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={signUpData.email}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, email: e.target.value })
                          }
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signUpData.password}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, password: e.target.value })
                          }
                        />
                        {errors.password && (
                          <p className="text-sm text-destructive">{errors.password}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">Confirm Password</Label>
                        <Input
                          id="signup-confirm"
                          type="password"
                          placeholder="••••••••"
                          value={signUpData.confirmPassword}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                          }
                        />
                        {errors.confirmPassword && (
                          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                        )}
                      </div>
                      <Button
                        type="submit"
                        variant="hero"
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
