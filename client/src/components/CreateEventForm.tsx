import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, MapPin, Users, Clock, CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CreateEventInput } from '../../../server/src/schema';

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export function CreateEventForm({ onSuccess }: CreateEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: null,
    location: '',
    start_date: new Date(),
    end_date: new Date(),
    max_capacity: 50
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate dates
      if (formData.end_date <= formData.start_date) {
        setErrorMessage('End date must be after start date');
        return;
      }

      const newEvent = await trpc.createEvent.mutate(formData);
      setSuccessMessage(`Event "${newEvent.title}" created successfully! 🎉`);
      
      // Reset form
      setFormData({
        title: '',
        description: null,
        location: '',
        start_date: new Date(),
        end_date: new Date(),
        max_capacity: 50
      });

      // Call success callback after a short delay
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      setErrorMessage('Failed to create event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTimeLocal = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Event Title
          </Label>
          <Input
            id="title"
            placeholder="Enter event title (e.g., Annual Tech Conference 2024)"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateEventInput) => ({ ...prev, title: e.target.value }))
            }
            required
            className="text-lg"
          />
        </div>

        {/* Event Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description (Optional)
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your event, what attendees can expect, agenda highlights..."
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateEventInput) => ({
                ...prev,
                description: e.target.value || null
              }))
            }
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            Location
          </Label>
          <Input
            id="location"
            placeholder="Event venue or online platform (e.g., Grand Convention Center, Zoom)"
            value={formData.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateEventInput) => ({ ...prev, location: e.target.value }))
            }
            required
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date" className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              Start Date & Time
            </Label>
            <Input
              id="start_date"
              type="datetime-local"
              value={formatDateTimeLocal(formData.start_date)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateEventInput) => ({ ...prev, start_date: new Date(e.target.value) }))
              }
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end_date" className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              End Date & Time
            </Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={formatDateTimeLocal(formData.end_date)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateEventInput) => ({ ...prev, end_date: new Date(e.target.value) }))
              }
              required
            />
          </div>
        </div>

        {/* Max Capacity */}
        <div className="space-y-2">
          <Label htmlFor="max_capacity" className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            Maximum Capacity
          </Label>
          <Input
            id="max_capacity"
            type="number"
            placeholder="50"
            value={formData.max_capacity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateEventInput) => ({ ...prev, max_capacity: parseInt(e.target.value) || 0 }))
            }
            min="1"
            required
          />
          <p className="text-xs text-gray-500">
            Set the maximum number of attendees for this event
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={isLoading || !formData.title || !formData.location}
            className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Event...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Preview Card */}
      {(formData.title || formData.location) && (
        <Card className="mt-8 border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Preview</CardTitle>
            <CardDescription>
              How your event will appear to attendees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{formData.title || 'Event Title'}</h3>
              {formData.description && (
                <p className="text-gray-600 text-sm">{formData.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>{formData.location || 'Event Location'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-3 w-3" />
                <span>Max {formData.max_capacity} attendees</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>
                  {formData.start_date.toLocaleDateString()} - {formData.end_date.toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}