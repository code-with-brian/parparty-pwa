import React, { useState } from 'react';
import { useConvexMutation } from '@/hooks/useConvexMutation';
import { useAction } from 'convex/react';
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
  // Pre-populate search query from URL parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('location') || '');
  const [apiKey, setApiKey] = useState('942c4412-8642-49dc-8144-e78c8b5aadec');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const upsertCourse = useConvexMutation(api.golfCourses.upsertGolfCourse);
  const batchImportCourses = useConvexMutation(api.golfCourses.batchImportCoursesWithCoordinates);
  const importCourseWithCoordinates = useConvexMutation(api.golfCourses.importCourseWithCoordinates);
  const importSampleData = useConvexMutation(api.golfCourses.importSamplePeterboroughCourses);

  // Golf API proxy actions to bypass CORS
  const searchClubsByLocation = useAction(api.golfApiProxy.searchClubsByLocation);
  const getCourseCoordinates = useAction(api.golfApiProxy.getCourseCoordinates);
  const testApiKey = useAction(api.golfApiProxy.testApiKey);

  const importer = new GolfDataImporter(apiKey);

  // Import sample Peterborough course with coordinates using new structure
  const handleImportSampleData = async () => {
    setImportStatus('loading');
    try {
      const peterboroughCourse = importer.getSampleCourseData("0121318782152310");
      if (!peterboroughCourse) {
        throw new Error("Peterborough course data not found");
      }
      
      const coordinates = importer.getFullPeterboroughCoordinates().coordinates;
      
      const result = await importCourseWithCoordinates({
        courseData: {
          externalId: peterboroughCourse.externalId,
          clubName: peterboroughCourse.clubName,
          courseName: peterboroughCourse.courseName,
          address: peterboroughCourse.address,
          city: peterboroughCourse.city,
          state: peterboroughCourse.state,
          country: peterboroughCourse.country,
          courseId: peterboroughCourse.courseId,
          numHoles: peterboroughCourse.numHoles,
          hasGPS: peterboroughCourse.hasGPS,
        },
        holeCoordinates: importer.transformHoleCoordinates(peterboroughCourse.courseId, coordinates),
      });
      
      setImportStatus('success');
      setImportResults([result]);
    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
    }
  };

  // Import all sample courses with full coordinate data using new structure
  const handleImportAllSamples = async () => {
    setImportStatus('loading');
    try {
      const sampleCourses = importer.getAllSampleCourses();
      
      // Transform to new structure with separate course data and hole coordinates
      const coursesToImport = sampleCourses.map(course => {
        const coordinates = course.courseId === "0121318782152310" 
          ? importer.getFullPeterboroughCoordinates().coordinates 
          : undefined;
        
        return {
          courseData: {
            externalId: course.externalId,
            clubName: course.clubName,
            courseName: course.courseName,
            address: course.address,
            city: course.city,
            state: course.state,
            country: course.country,
            courseId: course.courseId,
            numHoles: course.numHoles,
            hasGPS: course.hasGPS,
          },
          holeCoordinates: importer.transformHoleCoordinates(course.courseId, coordinates),
        };
      });
      
      const result = await batchImportCourses({ courses: coursesToImport });
      setImportStatus('success');
      setImportResults(result);
    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
    }
  };

  // Search for courses by location using backend proxy to bypass CORS
  const handleSearch = async () => {
    if (!apiKey) {
      alert('Please enter your Golf API key first');
      return;
    }
    
    if (!searchQuery.trim()) {
      alert('Please enter a search location');
      return;
    }
    
    setImportStatus('loading');
    try {
      // First test the API key
      const testResult = await testApiKey({ apiKey });
      console.log('🔑 API Key test result:', testResult);
      
      if (!testResult.success) {
        throw new Error(testResult.message || 'Invalid API key');
      }

      // Use backend proxy to search Golf API
      const result = await searchClubsByLocation({ 
        location: searchQuery, 
        apiKey 
      });

      console.log('🔍 Search result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      // Transform the API response to match our format
      const allCourses = result.data.clubs?.flatMap((club: any) =>
        club.courses?.map((course: any) => ({
          ...importer.transformClubData(club, course),
          selected: false,
          distance: club.distance || ''
        })) || []
      ) || [];

      // Filter courses to only show those from the searched location/region
      // For "Peterborough, ON, Canada" - look for Peterborough AND ON/Ontario AND Canada
      const searchLower = searchQuery.toLowerCase();
      const courses = allCourses.filter((course: any) => {
        const city = course.city?.toLowerCase() || '';
        const state = course.state?.toLowerCase() || '';
        const country = course.country?.toLowerCase() || '';
        
        // For Canadian searches, be more specific
        if (searchLower.includes('canada') || searchLower.includes('on')) {
          return (
            country.includes('canada') &&
            (state.includes('on') || state.includes('ontario')) &&
            (searchLower.includes('peterborough') ? city.includes('peterborough') : true)
          );
        }
        
        // For other locations, use broader matching
        const searchTerms = searchQuery.toLowerCase().split(',').map(term => term.trim());
        const courseLocation = `${city} ${state} ${country}`;
        return searchTerms.some(term => courseLocation.includes(term));
      });

      console.log(`📍 Filtered ${courses.length} courses from ${allCourses.length} total courses`);
      console.log(`🏌️ Sample filtered courses:`, courses.slice(0, 3).map(c => ({
        name: c.clubName,
        city: c.city,
        state: c.state,
        country: c.country
      })));

      setImportResults(courses);
      setImportStatus('idle');
      
      if (courses.length === 0) {
        alert('No courses found for this location. Try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setImportStatus('idle');
      
      // Show error and offer sample data
      const useaSampleData = confirm(
        `API search failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        'Would you like to use sample data instead?'
      );
      
      if (useaSampleData) {
        const sampleCourses = importer.getAllSampleCourses();
        setImportResults(sampleCourses.map(course => ({
          ...course,
          selected: false
        })));
      }
    }
  };

  // Toggle course selection
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Import selected courses with coordinates using backend proxy
  const handleImportSelected = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to import');
      return;
    }

    setImportStatus('loading');
    try {
      const coursesToImport = [];
      
      // For each selected course, fetch its coordinates using backend proxy
      for (const courseId of selectedCourses) {
        const course = importResults.find(c => c.courseId === courseId);
        if (!course) continue;
        
        console.log(`📍 Fetching coordinates for ${course.clubName}...`);
        
        // Fetch coordinates using backend proxy
        const coordResult = await getCourseCoordinates({
          courseId: course.courseId,
          apiKey
        });
        
        let coordinates = undefined;
        if (coordResult.success && coordResult.data.coordinates) {
          coordinates = coordResult.data.coordinates;
          console.log(`✅ Got ${coordinates.length} coordinates for ${course.clubName}`);
        } else {
          console.log(`⚠️ No coordinates available for ${course.clubName}`);
        }
        
        coursesToImport.push({
          courseData: {
            externalId: course.externalId || course.courseId,
            clubName: course.clubName,
            courseName: course.courseName,
            address: course.address,
            city: course.city,
            state: course.state,
            country: course.country,
            courseId: course.courseId,
            numHoles: course.numHoles,
            hasGPS: course.hasGPS,
          },
          holeCoordinates: importer.transformHoleCoordinates(course.courseId, coordinates),
        });
      }

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