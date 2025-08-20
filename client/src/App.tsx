import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Mic, Plus } from 'lucide-react';
import { EventsManagement } from '@/components/EventsManagement';
import { CreateEventForm } from '@/components/CreateEventForm';
import { AttendeesManagement } from '@/components/AttendeesManagement';
import { SpeakersManagement } from '@/components/SpeakersManagement';

function App() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 Event Planner Pro
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your events, attendees, and speakers all in one place
          </p>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </TabsTrigger>
            <TabsTrigger value="attendees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees
            </TabsTrigger>
            <TabsTrigger value="speakers" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Speakers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Events Management
                </CardTitle>
                <CardDescription>
                  View, edit, and manage all your events with availability tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-600" />
                  Create New Event
                </CardTitle>
                <CardDescription>
                  Schedule a new event with all the details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateEventForm onSuccess={() => setActiveTab('events')} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Attendees Management
                </CardTitle>
                <CardDescription>
                  Manage event registrations and send invitations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendeesManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="speakers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-orange-600" />
                  Speakers Management
                </CardTitle>
                <CardDescription>
                  Manage your speaker roster and event assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpeakersManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;