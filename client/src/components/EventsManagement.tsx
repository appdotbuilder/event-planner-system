import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, MapPin, Users, Edit, Trash2, Eye } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Event, UpdateEventInput } from '../../../server/src/schema';

export function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateEventInput>({
    id: 0,
    title: '',
    description: null,
    location: '',
    start_date: new Date(),
    end_date: new Date(),
    max_capacity: 0,
    is_active: true
  });

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getEvents.query();
      setEvents(result);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setEditFormData({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_date: event.start_date,
      end_date: event.end_date,
      max_capacity: event.max_capacity,
      is_active: event.is_active
    });
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    setIsLoading(true);
    try {
      const updatedEvent = await trpc.updateEvent.mutate(editFormData);
      setEvents((prev: Event[]) => 
        prev.map((event: Event) => event.id === editingEvent.id ? { ...event, ...updatedEvent } : event)
      );
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (eventId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteEvent.mutate({ id: eventId });
      setEvents((prev: Event[]) => prev.filter((event: Event) => event.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailabilityStatus = (event: Event) => {
    const availableSpots = event.max_capacity - event.current_bookings;
    const percentageFull = (event.current_bookings / event.max_capacity) * 100;
    
    if (percentageFull >= 100) return { label: 'Full', color: 'destructive' as const };
    if (percentageFull >= 80) return { label: 'Almost Full', color: 'secondary' as const };
    return { label: `${availableSpots} spots left`, color: 'default' as const };
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No events yet</h3>
          <p className="text-gray-500">Create your first event to get started!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => {
            const availability = getAvailabilityStatus(event);
            return (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <Badge variant={event.is_active ? 'default' : 'secondary'}>
                          {event.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={availability.color}>
                          {availability.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{event.current_bookings} / {event.max_capacity} attendees</span>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedEvent(event)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      {selectedEvent && (
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{selectedEvent.title}</DialogTitle>
                            <DialogDescription>Event details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Description</Label>
                              <p className="text-sm text-gray-600 mt-1">
                                {selectedEvent.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Location</Label>
                                <p className="text-sm text-gray-600 mt-1">{selectedEvent.location}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Capacity</Label>
                                <p className="text-sm text-gray-600 mt-1">
                                  {selectedEvent.current_bookings} / {selectedEvent.max_capacity}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Start Date</Label>
                                <p className="text-sm text-gray-600 mt-1">{formatDate(selectedEvent.start_date)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">End Date</Label>
                                <p className="text-sm text-gray-600 mt-1">{formatDate(selectedEvent.end_date)}</p>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Created</Label>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(selectedEvent.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      {editingEvent && (
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Event</DialogTitle>
                            <DialogDescription>Update event details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={editFormData.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setEditFormData((prev: UpdateEventInput) => ({ ...prev, title: e.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={editFormData.description || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                  setEditFormData((prev: UpdateEventInput) => ({
                                    ...prev,
                                    description: e.target.value || null
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>Location</Label>
                              <Input
                                value={editFormData.location}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setEditFormData((prev: UpdateEventInput) => ({ ...prev, location: e.target.value }))
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Start Date</Label>
                                <Input
                                  type="datetime-local"
                                  value={editFormData.start_date ? new Date(editFormData.start_date.getTime() - editFormData.start_date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditFormData((prev: UpdateEventInput) => ({ ...prev, start_date: new Date(e.target.value) }))
                                  }
                                />
                              </div>
                              <div>
                                <Label>End Date</Label>
                                <Input
                                  type="datetime-local"
                                  value={editFormData.end_date ? new Date(editFormData.end_date.getTime() - editFormData.end_date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditFormData((prev: UpdateEventInput) => ({ ...prev, end_date: new Date(e.target.value) }))
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Max Capacity</Label>
                              <Input
                                type="number"
                                value={editFormData.max_capacity}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setEditFormData((prev: UpdateEventInput) => ({ ...prev, max_capacity: parseInt(e.target.value) || 0 }))
                                }
                                min="1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={editFormData.is_active}
                                onCheckedChange={(checked: boolean) =>
                                  setEditFormData((prev: UpdateEventInput) => ({ ...prev, is_active: checked }))
                                }
                              />
                              <Label>Active</Label>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setEditingEvent(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateEvent} disabled={isLoading}>
                              {isLoading ? 'Updating...' : 'Update Event'}
                            </Button>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the event
                            "{event.title}" and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(event.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Event
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}