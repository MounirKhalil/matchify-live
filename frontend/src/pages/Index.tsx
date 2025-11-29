import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Briefcase, CheckCircle2, FileText, Sparkles, Target, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Matchify
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-4">
              <p className="text-sm font-medium text-primary">AI-Powered Job Matching Platform</p>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Your AI Agent for
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Perfect Job Matches</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create once, apply everywhere. Let AI find jobs, tailor your CV, and submit applications automatically—while you stay in control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-lg px-8">
                  <Sparkles className="mr-2" />
                  Start Matching Now
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8">
                Watch Demo
              </Button>
            </div>
            <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agentic Work Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">Agentic Work: Your 24/7 Job Assistant</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI agent works around the clock to find opportunities, match your profile, and apply on your behalf.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Job Discovery",
                description: "Continuously scans job listings to find the most relevant matches for your profile.",
              },
              {
                icon: Zap,
                title: "Profile Matching",
                description: "Analyzes both your CV and job requirements to ensure accurate alignment.",
              },
              {
                icon: FileText,
                title: "CV Tailoring",
                description: "Automatically adapts your CV to highlight the most relevant skills for each job.",
              },
              {
                icon: Briefcase,
                title: "Application Preparation",
                description: "Prepares all necessary documents and applies automatically with your approval.",
              },
              {
                icon: CheckCircle2,
                title: "Notifications & Tracking",
                description: "Sends real-time updates on each application's status and recruiter responses.",
              },
              {
                icon: Bot,
                title: "Interactive Chatbot",
                description: "Your personal assistant to quickly surface the most relevant profiles and jobs.",
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-gradient-card border-border/50 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Recruiters & Job Seekers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Job Seekers */}
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
                <p className="text-sm font-medium text-accent">For Job Seekers</p>
              </div>
              <h3 className="text-3xl font-bold">One-Time Setup, Endless Opportunities</h3>
              <p className="text-lg text-muted-foreground">
                Create your profile once, and let our AI agent handle the rest—from finding perfect matches to submitting applications.
              </p>
              <div className="space-y-4">
                {[
                  "Intelligent Job Agent finds and matches opportunities 24/7",
                  "Tailors your CV to each job's requirements automatically",
                  "Seamless submission & tracking with approval controls",
                  "Optional manual mode for full control when you want it",
                  "Real-time notifications on application status",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success mt-0.5 flex-shrink-0" />
                    <p className="text-foreground">{item}</p>
                  </div>
                ))}
              </div>
              <Link to="/auth">
                <Button variant="hero" size="lg" className="mt-4">
                  Start Your Job Search
                </Button>
              </Link>
            </div>

            {/* Recruiters */}
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
                <p className="text-sm font-medium text-secondary">For Recruiters</p>
              </div>
              <h3 className="text-3xl font-bold">Smart Matching, Faster Hiring</h3>
              <p className="text-lg text-muted-foreground">
                Post once and receive explainable candidate shortlists powered by AI, with clear reasons why each candidate fits.
              </p>
              <div className="space-y-4">
                {[
                  "Instant job posting with AI-powered candidate matching",
                  "Smart chatbot recommends best-matched applicants",
                  "Powerful search & filters for precise candidate discovery",
                  "Explainable matches with evidence-linked reasons",
                  "Streamlined dashboard with unified tracking",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success mt-0.5 flex-shrink-0" />
                    <p className="text-foreground">{item}</p>
                  </div>
                ))}
              </div>
              <Link to="/auth">
                <Button variant="hero" size="lg" className="mt-4">
                  <Users className="mr-2" />
                  Find Top Talent
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Ethics */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h3 className="text-3xl md:text-4xl font-bold">Built on Trust, Transparency & Fairness</h3>
            <p className="text-lg text-muted-foreground">
              We design our platform with your privacy and control at the core of everything we do.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-12 text-left">
              {[
                {
                  title: "Explicit User Consent",
                  description: "No applications submitted without your clear approval, unless you enable full automation.",
                },
                {
                  title: "Privacy & Control",
                  description: "You fully manage your CV visibility, personal data, and sharing preferences.",
                },
                {
                  title: "Transparent Matching",
                  description: "Our matching process is explainable—see exactly why you match each job.",
                },
                {
                  title: "Responsible AI",
                  description: "We prevent unfair prioritization and ensure ethical, responsible recommendations.",
                },
              ].map((item, i) => (
                <Card key={i} className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-base">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h3 className="text-3xl md:text-5xl font-bold">Ready to Transform Your Job Search?</h3>
            <p className="text-xl text-muted-foreground">
              Join thousands who've already discovered the power of AI-driven job matching.
            </p>
            <Link to="/auth">
              <Button variant="hero" size="lg" className="text-xl px-12 py-6 mt-8">
                <Sparkles className="mr-2" />
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Matchify</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered job matching for smarter hiring and faster applications.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 Matchify. American University of Beirut. All rights reserved.</p>
            <p className="mt-2">Mounir Khalil · Haidar Yassine · Hassan Khalil</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
