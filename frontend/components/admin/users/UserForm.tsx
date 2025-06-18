import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X } from "lucide-react";
import FaceUpload from "./FaceUpload";
import { User } from "../AdminDashboardContainer";
import { api } from '@/lib/api';

// Access zones options
const accessZonesOptions = [
  "Main Entrance",
  "Zone A",
  "Zone B",
  "Server Room",
  "Warehouse",
  "Executive Suite",
  "Cafeteria",
];

// Job title options
const jobTitleOptions = [
  "Software Engineer",
  "Product Manager",
  "Security Officer",
  "Human Resources",
  "Marketing Specialist",
  "Operations Manager",
  "IT Administrator",
  "Executive",
];

interface UserFormProps {
  onSubmit: (userData: Omit<User, 'id'>) => Promise<void>;
  loading: boolean;
}

export default function UserForm({ onSubmit, loading }: UserFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
    jobTitle: '',
    accessZones: [] as string[],
    image: '',
  });

  const [emailError, setEmailError] = useState<string | null>(null);
  const [accessZonesOpen, setAccessZonesOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    } else {
      setEmailError(null);
      return true;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setFormData(prev => ({ ...prev, email: newEmail }));
    if (newEmail) {
      validateEmail(newEmail);
    } else {
      setEmailError(null);
    }
  };

  const toggleAccessZone = (zone: string) => {
    setFormData(prev => ({
      ...prev,
      accessZones: prev.accessZones.includes(zone)
        ? prev.accessZones.filter(z => z !== zone)
        : [...prev.accessZones, zone]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {    
    e.preventDefault();
    console.log("User Form submitted");
    
    if (!validateEmail(formData.email)) {
      return;
    }

    if (!formData.fullName || !formData.password || !formData.role || !formData.jobTitle || formData.accessZones.length === 0) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the API directly
      const userData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        jobTitle: formData.jobTitle,
        accessZones: formData.accessZones,
        image: formData.image || undefined,
      };

      const response = await api.createUser(userData);
      
      // Call the parent onSubmit to update the UI
      await onSubmit({
        email: formData.email,
        full_name: formData.fullName,
        role: formData.role,
        job_title: formData.jobTitle,
        access_zones: formData.accessZones,
        avatar_url: formData.image || undefined,
      });

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: '',
        jobTitle: '',
        accessZones: [],
        image: '',
      });
      setEmailError(null);
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            placeholder="Enter full name"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={handleEmailChange}
            className={emailError ? "border-red-500" : ""}
            required
          />
          {emailError && (
            <div className="flex items-center mt-1 text-red-500 text-sm">
              <X className="w-4 h-4 mr-1" />
              {emailError}
            </div>
          )}
          {formData.email && !emailError && (
            <div className="flex items-center mt-1 text-green-600 text-sm">
              <Check className="w-4 h-4 mr-1" />
              Valid email format
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="role">User Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
          >
            <SelectTrigger id="role" className="bg-slate-50">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="jobTitle">Job Title/Position *</Label>
          <Select
            value={formData.jobTitle}
            onValueChange={(value) => setFormData(prev => ({ ...prev, jobTitle: value }))}
          >
            <SelectTrigger
              id="jobTitle"
              className="bg-slate-50 border-0 h-12"
            >
              <SelectValue placeholder="Select job title" />
            </SelectTrigger>
            <SelectContent>
              {jobTitleOptions.map((title) => (
                <SelectItem key={title} value={title}>
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Access Zones Multi-select */}
      <div>
        <Label htmlFor="accessZones">Access Zones *</Label>
        <Popover
          open={accessZonesOpen}
          onOpenChange={setAccessZonesOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={accessZonesOpen}
              className="w-full justify-between bg-slate-50 border-0 h-12 text-left font-normal"
            >
              {formData.accessZones.length > 0
                ? `${formData.accessZones.length} zone${
                    formData.accessZones.length > 1 ? "s" : ""
                  } selected`
                : "Select access zones"}
              <span className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <div className="p-2 space-y-2 max-h-[300px] overflow-auto">
              {accessZonesOptions.map((zone) => (
                <div
                  key={zone}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`zone-${zone}`}
                    checked={formData.accessZones.includes(zone)}
                    onCheckedChange={() => toggleAccessZone(zone)}
                  />
                  <label
                    htmlFor={`zone-${zone}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {zone}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Face Upload */}
      <div>
        <Label>Face Image *</Label>
        <FaceUpload
          onImageCaptured={(imageData) => {
            console.log("Image captured", imageData);
            setFormData(prev => ({ ...prev, image: imageData }));
          }}
          onCancel={() => setFormData(prev => ({ ...prev, image: '' }))}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !formData.fullName || !formData.email || !formData.password || !formData.role || !formData.jobTitle || formData.accessZones.length === 0}
        className="w-full bg-teal-600 hover:bg-teal-700"
      >
        {isSubmitting ? "Creating User..." : "Create User"}
      </Button>
    </form>
  );
}
