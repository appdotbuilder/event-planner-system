import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Mail, UserPlus, Edit, Trash2, Send } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Event, Attendee, CreateAttendeeInput, UpdateAttendeeInput, RegistrationStatus } from '../../../server/src/schema';

export function AttendeesManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [newAttendeeForm, setNewAttendeeForm] = useState<CreateAttendeeInput>({
    event_id: 0,
    name: '',
    email: '',
    registration_status: 'pending'
  });

  const [editAttendeeForm, setEditAttendeeForm] = useState<UpdateAttendeeInput>({
    id: 0,
    name: '',
    email: '',
    registration_status: 'pending'
  });

  const loadEvents = useCallback(async () => {
    try {
      const result = await trpc.getEvents.query();
      setEvents(result);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }, []);

  const loadAttendees = useCallback(async () => {
    try {
      setIsLoading(true);
      if (selectedEventId) {
        const result = await trpc.getAttendeesByEventId.query({ id: selectedEventId });
        setAttendees(result);
      } else {
        const result = await trpc.getAllAttendees.query();
        setAttendees(result);
      }
    } catch (error) {
      console.error('Failed to load attendees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  const handleCreateAttendee = async () => {
    if (!newAttendeeForm.event_id) return;
    
    setIsLoading(true);
    try {
      const newAttendee = await trpc.createAttendee.mutate(newAttendeeForm);
      if (!selectedEventId || selectedEventId === newAttendeeForm.event_id) {
        setAttendees((prev: Attendee[]) => [...prev, newAttendee]);
      }
      
      setNewAttendeeForm({
        event_id: newAttendeeForm.event_id,
        name: '',
        email: '',
        registration_status: 'pending'
      });
      
      setIsDialogOpen(false);
      setSuccessMessage('Attendee registered successfully! 🎉');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create attendee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAttendee = async () => {
    if (!editingAttendee) return;
    
    setIsLoading(true);
    try {
      const updatedAttendee = await trpc.updateAttendee.mutate(editAttendeeForm);
      setAttendees((prev: Attendee[]) =>
        prev.map((attendee: Attendee) => 
          attendee.id === editingAttendee.id 
            ? { ...attendee, ...updatedAttendee }
            : attendee
        )
      );
      setEditingAttendee(null);
      setSuccessMessage('Attendee updated successfully! ✅');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update attendee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttendee = async (attendeeId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteAttendee.mutate({ id: attendeeId });
      setAttendees((prev: Attendee[]) => 
        prev.filter((attendee: Attendee) => attendee.id !== attendeeId)
      );
      setSuccessMessage('Attendee removed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to delete attendee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvitation = async (attendeeId: number) => {
    try {
      // This is a stub function as mentioned in the requirements
      await trpc.sendInvitation.mutate({ 
        attendee_id: attendeeId, 
        message: 'Welcome to our event!' 
      });
      setSuccessMessage('Invitation sent! 📧 (Note: This is a demo function)');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const handleEditAttendee = (attendee: Attendee) => {
    setEditingAttendee(attendee);
    setEditAttendeeForm({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      registration_status: attendee.registration_status
    });
  };

  const getStatusBadgeColor = (status: RegistrationStatus) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getEventName = (eventId: number) => {
    const event = events.find((e: Event) => e.id === eventId);
    return event ? event.title : 'Unknown Event';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Attendee Management</h2>
          <p className="text-gray-600">Manage registrations and send invitations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select onValueChange={(value) => setSelectedEventId(value === 'all' ? null : Number(value))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event: Event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Attendee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Attendee</DialogTitle>
                <DialogDescription>Add a new attendee to an event</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Event</Label>
                  <Select onValueChange={(value) => 
                    setNewAttendeeForm((prev: CreateAttendeeInput) => ({ ...prev, event_id: Number(value) }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event: Event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newAttendeeForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewAttendeeForm((prev: CreateAttendeeInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter attendee name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newAttendeeForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewAttendeeForm((prev: CreateAttendeeInput) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={newAttendeeForm.registration_status}
                    onValueChange={(value: RegistrationStatus) =>
                      setNewAttendeeForm((prev: CreateAttendeeInput) => ({ ...prev, registration_status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAttendee} 
                  disabled={isLoading || !newAttendeeForm.name || !newAttendeeForm.email || !newAttendeeForm.event_id}
                >
                  {isLoading ? 'Adding...' : 'Add Attendee'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Attendees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {selectedEventId ? `Attendees for ${getEventName(selectedEventId)}` : 'All Attendees'} 
            ({attendees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading attendees...</span>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No attendees found</p>
              <p className="text-sm text-gray-500">Add some attendees to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {!selectedEventId && <TableHead>Event</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendees.map((attendee: Attendee) => (
                    <TableRow key={attendee.id}>
                      <TableCell className="font-medium">{attendee.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {attendee.email}
                        </div>
                      </TableCell>
                      {!selectedEventId && (
                        <TableCell className="text-sm text-gray-600">
                          {getEventName(attendee.event_id)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(attendee.registration_status)}>
                          {attendee.registration_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(attendee.registered_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvitation(attendee.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Invite
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAttendee(attendee)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAttendee(attendee.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Attendee Dialog */}
      <Dialog open={!!editingAttendee} onOpenChange={() => setEditingAttendee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendee</DialogTitle>
            <DialogDescription>Update attendee information</DialogDescription>
          </DialogHeader>
          {editingAttendee && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editAttendeeForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditAttendeeForm((prev: UpdateAttendeeInput) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editAttendeeForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditAttendeeForm((prev: UpdateAttendeeInput) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={editAttendeeForm.registration_status}
                  onValueChange={(value: RegistrationStatus) =>
                    setEditAttendeeForm((prev: UpdateAttendeeInput) => ({ ...prev, registration_status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditingAttendee(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAttendee} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Attendee'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}