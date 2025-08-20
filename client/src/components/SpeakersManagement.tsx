import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Mail, Phone, User, Plus, Edit, Trash2, UserCheck } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Event, Speaker, CreateSpeakerInput, UpdateSpeakerInput, AssignSpeakerInput } from '../../../server/src/schema';

export function SpeakersManagement() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  
  const [newSpeakerForm, setNewSpeakerForm] = useState<CreateSpeakerInput>({
    name: '',
    bio: null,
    email: '',
    phone: null,
    expertise: null
  });

  const [editSpeakerForm, setEditSpeakerForm] = useState<UpdateSpeakerInput>({
    id: 0,
    name: '',
    bio: null,
    email: '',
    phone: null,
    expertise: null
  });

  const [assignForm, setAssignForm] = useState<AssignSpeakerInput>({
    event_id: 0,
    speaker_id: 0
  });

  const loadSpeakers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getSpeakers.query();
      setSpeakers(result);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const result = await trpc.getEvents.query();
      setEvents(result);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }, []);

  useEffect(() => {
    loadSpeakers();
    loadEvents();
  }, [loadSpeakers, loadEvents]);

  const handleCreateSpeaker = async () => {
    setIsLoading(true);
    try {
      const newSpeaker = await trpc.createSpeaker.mutate(newSpeakerForm);
      setSpeakers((prev: Speaker[]) => [...prev, newSpeaker]);
      
      setNewSpeakerForm({
        name: '',
        bio: null,
        email: '',
        phone: null,
        expertise: null
      });
      
      setIsDialogOpen(false);
      setSuccessMessage('Speaker added successfully! 🎤');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create speaker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSpeaker = async () => {
    if (!editingSpeaker) return;
    
    setIsLoading(true);
    try {
      const updatedSpeaker = await trpc.updateSpeaker.mutate(editSpeakerForm);
      setSpeakers((prev: Speaker[]) =>
        prev.map((speaker: Speaker) => 
          speaker.id === editingSpeaker.id 
            ? { ...speaker, ...updatedSpeaker }
            : speaker
        )
      );
      setEditingSpeaker(null);
      setSuccessMessage('Speaker updated successfully! ✅');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update speaker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpeaker = async (speakerId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteSpeaker.mutate({ id: speakerId });
      setSpeakers((prev: Speaker[]) => 
        prev.filter((speaker: Speaker) => speaker.id !== speakerId)
      );
      setSuccessMessage('Speaker removed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to delete speaker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSpeaker = async () => {
    if (!assignForm.event_id || !assignForm.speaker_id) return;
    
    try {
      await trpc.assignSpeakerToEvent.mutate(assignForm);
      setAssignDialogOpen(false);
      setSuccessMessage('Speaker assigned to event successfully! 🎯');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to assign speaker:', error);
    }
  };

  const handleEditSpeaker = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setEditSpeakerForm({
      id: speaker.id,
      name: speaker.name,
      bio: speaker.bio,
      email: speaker.email,
      phone: speaker.phone,
      expertise: speaker.expertise
    });
  };

  const handleAssignDialogOpen = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setAssignForm({
      speaker_id: speaker.id,
      event_id: 0
    });
    setAssignDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Speaker Management</h2>
          <p className="text-gray-600">Manage your speaker roster and event assignments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Speaker
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Speaker</DialogTitle>
              <DialogDescription>Create a new speaker profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newSpeakerForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSpeakerForm((prev: CreateSpeakerInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter speaker name"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newSpeakerForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSpeakerForm((prev: CreateSpeakerInput) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter email address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newSpeakerForm.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSpeakerForm((prev: CreateSpeakerInput) => ({ 
                        ...prev, 
                        phone: e.target.value || null 
                      }))
                    }
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label>Expertise</Label>
                  <Input
                    value={newSpeakerForm.expertise || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSpeakerForm((prev: CreateSpeakerInput) => ({ 
                        ...prev, 
                        expertise: e.target.value || null 
                      }))
                    }
                    placeholder="e.g., AI, Web Development"
                  />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={newSpeakerForm.bio || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewSpeakerForm((prev: CreateSpeakerInput) => ({ 
                      ...prev, 
                      bio: e.target.value || null 
                    }))
                  }
                  placeholder="Brief speaker biography..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSpeaker} 
                disabled={isLoading || !newSpeakerForm.name || !newSpeakerForm.email}
              >
                {isLoading ? 'Adding...' : 'Add Speaker'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Speakers Grid */}
      {isLoading && speakers.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-gray-600">Loading speakers...</span>
        </div>
      ) : speakers.length === 0 ? (
        <div className="text-center py-12">
          <Mic className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No speakers yet</h3>
          <p className="text-gray-500">Add speakers to build your roster!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {speakers.map((speaker: Speaker) => (
            <Card key={speaker.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{speaker.name}</CardTitle>
                      {speaker.expertise && (
                        <Badge variant="secondary" className="mt-1">
                          {speaker.expertise}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {speaker.bio && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {speaker.bio}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{speaker.email}</span>
                  </div>
                  {speaker.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{speaker.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignDialogOpen(speaker)}
                    className="flex-1"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSpeaker(speaker)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSpeaker(speaker.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Speaker Dialog */}
      <Dialog open={!!editingSpeaker} onOpenChange={() => setEditingSpeaker(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Speaker</DialogTitle>
            <DialogDescription>Update speaker information</DialogDescription>
          </DialogHeader>
          {editingSpeaker && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editSpeakerForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditSpeakerForm((prev: UpdateSpeakerInput) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editSpeakerForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditSpeakerForm((prev: UpdateSpeakerInput) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editSpeakerForm.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditSpeakerForm((prev: UpdateSpeakerInput) => ({ 
                        ...prev, 
                        phone: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Expertise</Label>
                  <Input
                    value={editSpeakerForm.expertise || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditSpeakerForm((prev: UpdateSpeakerInput) => ({ 
                        ...prev, 
                        expertise: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={editSpeakerForm.bio || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditSpeakerForm((prev: UpdateSpeakerInput) => ({ 
                      ...prev, 
                      bio: e.target.value || null 
                    }))
                  }
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditingSpeaker(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSpeaker} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Speaker'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Speaker Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Speaker to Event</DialogTitle>
            <DialogDescription>
              {selectedSpeaker && `Assign ${selectedSpeaker.name} to an event`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Event</Label>
              <Select onValueChange={(value) => 
                setAssignForm((prev: AssignSpeakerInput) => ({ ...prev, event_id: Number(value) }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event" />
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
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignSpeaker} 
              disabled={!assignForm.event_id}
            >
              Assign Speaker
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}