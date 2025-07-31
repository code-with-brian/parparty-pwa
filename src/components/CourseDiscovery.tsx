import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { MapPin, Phone, Globe, Users, TrendingUp } from 'lucide-react';

interface CourseDiscoveryProps {
  onCourseSelect?: (courseId: string) => void;
}

export const CourseDiscovery: React.FC<CourseDiscoveryProps> = ({ onCourseSelect }) => {
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');

  const courses = useQuery(api.courses.getCoursesByLocation, {
    city: searchCity || undefined,
    state: searchState || undefined,
  });

  const handleSearch = () => {
    // Search is reactive, no need for explicit handler
  };

  const getPartnershipBadgeColor = (level: string) => {
    switch (level) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (!courses) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by city..."
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Search by state..."
          value={searchState}
          onChange={(e) => setSearchState(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch} variant="outline">
          Search
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{course.name}</CardTitle>
                <Badge className={getPartnershipBadgeColor(course.partnershipLevel)}>
                  {course.partnershipLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{course.address}</span>
              </div>
              
              {course.city && course.state && (
                <div className="text-sm text-gray-600">
                  {course.city}, {course.state} {course.zipCode}
                </div>
              )}

              {course.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{course.phone}</span>
                </div>
              )}

              {course.website && (
                <div className="flex items-center text-sm text-gray-600">
                  <Globe className="h-4 w-4 mr-2" />
                  <a 
                    href={course.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}

              {course.analytics && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-green-600" />
                    <span>{course.analytics.totalGames} games</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                    <span>${course.analytics.averageOrderValue.toFixed(0)} avg</span>
                  </div>
                </div>
              )}

              {onCourseSelect && (
                <Button 
                  onClick={() => onCourseSelect(course._id)}
                  className="w-full mt-4"
                >
                  View Course Events
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No courses found in this area. Try expanding your search.
        </div>
      )}
    </div>
  );
};