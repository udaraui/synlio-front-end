'use client';

import React, { useState, useMemo } from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { User } from '@/interfaces/user';
import { Badge } from '../ui/badge';
// import { OwnerSelectorPopup } from '@/app/(pages)/project-management/project-group/components/ownerSelectorPopup';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CircleUser, CircleUserRound, ShieldUser } from 'lucide-react';

interface OwnerSelectorProps {
  owners: User[];
  selectedOwnerIds: number[];
  onSelectionChange: (ownerIds: number[]) => void;
  isLoading?: boolean;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function OwnerSelector({
  owners,
  selectedOwnerIds,
  onSelectionChange,
  isLoading = false,
  label = 'Owners',
  required = true,
  disabled = false,
}: OwnerSelectorProps) {
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

  // Filter owners based on search query
  const filteredOwners = useMemo(() => {
    if (!ownerSearchQuery.trim()) return owners;

    const searchLower = ownerSearchQuery.toLowerCase().trim();
    return owners.filter(owner => {
      const fullName = `${owner.first_name} ${owner.last_name}`.toLowerCase();
      const email = owner.email?.toLowerCase() || '';
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [owners, ownerSearchQuery]);

  const isSearching = ownerSearchQuery.trim().length > 0;
  const allOwnersSelected = owners.length > 0 && owners.every(u => selectedOwnerIds.includes(u.id));

  const handleSelectAll = () => {
    if (allOwnersSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(owners.map(u => u.id));
    }
  };

  const handleToggleOwner = (ownerId: number) => {
    if (selectedOwnerIds.includes(ownerId)) {
      onSelectionChange(selectedOwnerIds.filter(id => id !== ownerId));
    } else {
      onSelectionChange([...selectedOwnerIds, ownerId]);
    }
  };

  const [value, setValue] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)

  return (
    <FormItem>
      <div className="flex items-center justify-between pt-6">
        <FormLabel>
          {/* {label} */}
          <FormLabel className="flex items-center gap-2 text-slate-600"><ShieldUser className="w-3.5 h-3.5" /> Owners <span className='text-destructive'>*</span></FormLabel>
          {/* <FormLabel className='font-normal text-gray-600'>
            Owners <span className='text-destructive'>*</span>
          </FormLabel> */}
        </FormLabel>
        {/* {selectedOwnerIds.length > 0 && (*/}
        {/*  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">*/}
        {/* {selectedOwnerIds.length} selected */}
        {/*  </span>*/}
        {/*)} */}
      </div>

      {/* multiSelector  */}
      {/* <OwnerSelectorPopup owners={[]} selectedOwnerIds={[]} onSelectionChange={function (ownerIds: number[]): void {
        throw new Error('Function not implemented.');
      }} /> */}

      {/* reso */}
      {/* <FormLabel className='pt-3'>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      <OwnerSelectorPopup owners={[]} selectedOwnerIds={[]} onSelectionChange={function (ownerIds: number[]): void {
        throw new Error('Function not implemented.');
      } } /> */}



      {/* <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex flex-wrap items-center py-2 focus-within:ring-0 focus-within:ring-ring
                border-2 border-t-0 border-x-0 focus-visible:ring-primary shadow-none">

            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setOpen(true)
              }}
              placeholder="Owners..."
              className="h-8 w-auto flex-1 border-0 shadow-none p-0 focus-visible:ring-0"
            />
          </div>
        </PopoverTrigger> */}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className="flex flex-wrap items-center gap-2 py-2 min-h-[40px] border-b-2  hover:cursor-pointer focus-within:border-primary transition-colors
             border-2 border-slate-200 rounded-lg px-3 focus-visible:border-primary focus-visible:ring-0 shadow-none placeholder:text-gray-400"
            onClick={() => setOpen(true)}
          >
            {/* 1. Render Selected Badges */}
            {selectedOwnerIds.map((id) => {
              const owner = owners.find((o) => o.id === id);
              if (!owner) return null;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1 py-1 text-secondary-foreground font-normal"
                >
                  {owner.first_name} {owner.last_name}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none hover:bg-muted p-0.5"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents opening popover when clicking X
                      handleToggleOwner(id);
                    }}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Badge>
              );
            })}

            {/* 2. The Search Input */}
            <Input
              // value={ownerSearchQuery} // Link this to your search state
              onChange={(e) => {
                setOwnerSearchQuery(e.target.value);
                setOpen(true);
              }}
              // placeholder={selectedOwnerIds.length === 0 ? "Select owners..." : ""}
              className="h-8 w-24 flex-1 border-0 shadow-none p-0 focus-visible:ring-0 min-w-[100px]"
            />
          </div>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[400px] p-1 mt-2">
          {/* <PopoverContent className="w-xl p-1"> */}
          <FormControl>
            <div className="rounded-lg overflow-hidden">
              {/* Search header */}
              <div className="bg-muted/50 p-3 border-b">
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Input
                    placeholder="Search owners by name or email..."
                    value={ownerSearchQuery}
                    onChange={(e) => setOwnerSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                    disabled={disabled}
                  />
                  {ownerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOwnerSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      disabled={disabled}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Owners list */}
              <div className="max-h-[262px] flex flex-col">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      Loading owners...
                    </div>
                  </div>
                ) : owners.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                      No Owners Found
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select a division to load owners
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {isSearching ? `${filteredOwners.length} found` : `${owners.length} total`}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={handleSelectAll}
                          disabled={disabled}
                        >
                          {allOwnersSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredOwners.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No matching owners
                        </p>
                      ) : (
                        filteredOwners.map((owner) => (
                          <label
                            key={owner.id}
                            className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                              }`}
                          >
                            <Checkbox
                              checked={selectedOwnerIds.includes(owner.id)}
                              onCheckedChange={() => handleToggleOwner(owner.id)}
                              disabled={disabled}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {owner.first_name} {owner.last_name}
                              </p>
                              {owner.email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {owner.email}
                                </p>
                              )}
                            </div>
                            {selectedOwnerIds.includes(owner.id) && (
                              <svg className="h-4 w-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </FormControl>
        </PopoverContent>
        {/*  */}

      </Popover>


      <FormMessage />
    </FormItem>
  );
}

