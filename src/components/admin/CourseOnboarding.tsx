import React, { useState } from 'react';
import { useConvexMutation } from '@/hooks/useConvexMutation';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Upload, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { GolfDataImporter } from '@/utils/golfDataImporter';

// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../../convex/_generated/dataModel';
type Id<T> = string;

export const CourseOnboarding: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const upsertCourse = useConvexMutation(api.golfCourses.upsertGolfCourse);
  const batchImportCourses = useConvexMutation(api.golfCourses.batchImportCourses);
  const importSampleData = useConvexMutation(api.golfCourses.importSamplePeterboroughCourses);

  const importer = new GolfDataImporter(apiKey);

  // Import sample Peterborough courses
  const handleImportSampleData = async () => {
    setImportStatus('loading');
    try {
      const result = await importSampleData({});
      setImportStatus('success');
      setImportResults([result]);
    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
    }
  };

  // Import all sample courses with full data
  const handleImportAllSamples = async () => {
    setImportStatus('loading');
    try {
      const courses = importer.getAllSampleCourses();
      const result = await batchImportCourses({ courses });
      setImportStatus('success');
      setImportResults(result);
    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
    }
  };

  // Search for courses by location
  const handleSearch = async () => {
    if (!apiKey) {
      alert('Please enter your Golf API key first');
      return;
    }
    
    // This would normally call the Golf API
    // For demo, we'll show the sample data
    const sampleCourses = importer.getAllSampleCourses();
    setImportResults(sampleCourses.map(course => ({
      ...course,
      selected: false
    })));
  };

  // Toggle course selection
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Import selected courses
  const handleImportSelected = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to import');
      return;
    }

    setImportStatus('loading');
    try {
      const coursesToImport = importResults
        .filter(course => selectedCourses.includes(course.courseId))
        .map(course => ({
          ...course,
          externalId: course.courseId // Ensure externalId is set
        }));

      const result = await batchImportCourses({ courses: coursesToImport });
      setImportStatus('success');
      setImportResults(result);
      setSelectedCourses([]);
    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Golf Course Onboarding
          </CardTitle>
          <CardDescription>
            Import golf courses from GolfAPI.io or use sample data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sample" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sample">Sample Data</TabsTrigger>
              <TabsTrigger value="search">Search Courses</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="sample" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import sample Peterborough, ON golf courses with full coordinate data
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Button 
                  onClick={handleImportSampleData}
                  disabled={importStatus === 'loading'}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Peterborough Golf & Country Club (with coordinates)
                </Button>

                <Button 
                  onClick={handleImportAllSamples}
                  disabled={importStatus === 'loading'}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import All 6 Peterborough Courses
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Golf API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your golfapi.io API key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Peterborough, ON, Canada"
                  />
                  <Button onClick={handleSearch} disabled={!apiKey}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {importResults.length > 0 && importStatus !== 'success' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Found {importResults.length} courses:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResults.map((course) => (
                      <div 
                        key={course.courseId}
                        className="flex items-center space-x-2 p-2 border rounded hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.courseId)}
                          onChange={() => toggleCourseSelection(course.courseId)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{course.clubName}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.courseName} • {course.city}, {course.state}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={handleImportSelected}
                    disabled={selectedCourses.length === 0 || importStatus === 'loading'}
                    className="w-full"
                  >
                    Import {selectedCourses.length} Selected Course{selectedCourses.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Manual course entry coming soon. Use the search or sample data options for now.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {/* Import Status */}
          {importStatus !== 'idle' && (
            <div className="mt-6">
              {importStatus === 'loading' && (
                <Alert>
                  <AlertDescription>Importing courses...</AlertDescription>
                </Alert>
              )}
              {importStatus === 'success' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully imported {importResults.length} course{importResults.length !== 1 ? 's' : ''}!
                  </AlertDescription>
                </Alert>
              )}
              {importStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error importing courses. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};