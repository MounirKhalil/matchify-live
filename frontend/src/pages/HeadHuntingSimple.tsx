/**
 * Simplified Headhunting - Platform-Managed PhantomBuster
 *
 * This is the simplified headhunting interface where recruiters don't need
 * to provide their own API keys. The platform manages PhantomBuster integration.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Search, Users, ExternalLink, Mail, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types & Schema
// ============================================================================

const formSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  location: z.string().optional(),
  seniority: z.string().optional(),
  skills: z.string().optional(),
  limit: z.coerce.number().min(10).max(200).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Candidate {
  id: string;
  full_name: string | null;
  headline: string | null;
  profile_url: string;
  location: string | null;
  company: string | null;
  job_title: string | null;
  source: 'linkedin';
  raw: Record<string, unknown>;
}

interface SearchResult {
  run: {
    id: string;
    status: 'completed' | 'failed';
    provider: 'linkedin';
    role: string;
    location?: string;
    seniority?: string;
    skills?: string[];
    query_string: string;
    created_at: string;
    error_message?: string;
  };
  candidates: Candidate[];
}

// ============================================================================
// Component
// ============================================================================

export default function HeadHuntingSimple() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: '',
      location: '',
      seniority: 'Any',
      skills: '',
      limit: 10, // Default to 10 for free tier (will be capped anyway)
    },
  });

  // ==========================================================================
  // Form Submit Handler
  // ==========================================================================

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    setSearchResult(null);

    try {
      console.log('[HeadHuntingSimple] Submitting search:', values);

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Parse skills
      const skills = values.skills
        ? values.skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : undefined;

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/headhunt-simple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            provider: 'linkedin',
            role: values.role,
            location: values.location || undefined,
            seniority: values.seniority === 'Any' ? undefined : values.seniority,
            skills,
            limit: values.limit || 100,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.details || `Search failed: ${response.status}`
        );
      }

      const result: SearchResult = await response.json();

      console.log('[HeadHuntingSimple] Search completed:', {
        candidates: result.candidates.length,
        status: result.run.status,
      });

      setSearchResult(result);

      toast.success(
        `Found ${result.candidates.length} candidate${result.candidates.length !== 1 ? 's' : ''}!`
      );
    } catch (err) {
      console.error('[HeadHuntingSimple] Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Search failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AI-Powered Headhunting
              </h1>
              <p className="text-gray-600">
                Find top talent on LinkedIn with AI-powered search
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/recruiter/headhunting')}
            >
              Advanced Headhunting
            </Button>
          </div>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Criteria
            </CardTitle>
            <CardDescription>
              No API keys needed - powered by our platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Role */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role / Job Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Senior TypeScript Developer"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        The role you're looking to fill
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Lebanon, New York, Remote"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Where to search for candidates
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Seniority */}
                  <FormField
                    control={form.control}
                    name="seniority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seniority Level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select seniority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Any">Any</SelectItem>
                            <SelectItem value="Junior">Junior</SelectItem>
                            <SelectItem value="Mid">Mid-Level</SelectItem>
                            <SelectItem value="Senior">Senior</SelectItem>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Principal">Principal</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Experience level required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Skills */}
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. TypeScript, React, Node.js"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated list of required skills
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Limit */}
                <FormField
                  control={form.control}
                  name="limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Results</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={10}
                          max={200}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of candidates to find (10-200)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Provider Info & Free Tier Notice */}
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-900 mb-2">
                      <Linkedin className="h-4 w-4" />
                      <span className="font-medium">LinkedIn Search</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Github className="h-4 w-4" />
                      <span>GitHub Search</span>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                  </div>

                  {/* Free Tier Notice */}
                  <Alert>
                    <AlertDescription className="text-sm">
                      <strong>Free Tier:</strong> Results limited to ~10 candidates per search.
                      Upgrade PhantomBuster plan for more results (up to 1000+ per search).
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching LinkedIn... (this may take up to 1 minute)
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Run Headhunting Agent
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle>Search Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {searchResult && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {searchResult.candidates.length} Candidates Found
                  </h2>
                  <p className="text-sm text-gray-600">
                    Search: "{searchResult.run.query_string}"
                  </p>
                </div>
              </div>
            </div>

            {/* Candidates Grid */}
            {searchResult.candidates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResult.candidates.map((candidate) => (
                  <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {candidate.full_name || 'Unnamed Candidate'}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {candidate.headline || candidate.job_title || 'No headline'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Company */}
                      {candidate.company && (
                        <div className="text-sm">
                          <span className="text-gray-600">Company:</span>{' '}
                          <span className="font-medium">{candidate.company}</span>
                        </div>
                      )}

                      {/* Location */}
                      {candidate.location && (
                        <div className="text-sm">
                          <span className="text-gray-600">Location:</span>{' '}
                          <span className="font-medium">{candidate.location}</span>
                        </div>
                      )}

                      {/* Source */}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Linkedin className="h-3 w-3 mr-1" />
                          LinkedIn
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(candidate.profile_url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        {candidate.raw.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(`mailto:${candidate.raw.email}`, '_blank')
                            }
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No candidates found. Try adjusting your search criteria.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
