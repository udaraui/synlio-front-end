"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPulseWeekToApprove, approvePulseWeek, rejectPulseWeek } from '@/services/pulse.service';
import { useAuth } from '@/contexts/auth.context';
import { PulseWeek } from '@/app/(pages)/pulse/components/PulseHistory';
import { Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'APPROVED': return '#10B981';
        case 'REJECTED': return '#EF4444';
        case 'FORWARDED': return '#3B82F6';
        case 'PENDING': return '#F59E0B';
        default: return '#6B7280';
    }
}

const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const ReviewContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState<{ intendedEmail: string } | null>(null);
    const [pulseWeek, setPulseWeek] = useState<PulseWeek | null>(null);
    const [payload, setPayload] = useState<{ weekId: number, companyId: number, submittedToEmail: string } | null>(null);
    const [actionSubmitting, setActionSubmitting] = useState(false);
    
    // State for rejection modal
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        if (!user) {
            // Construct the path manually using searchParams to avoid hydration bugs with window.location.search
            const paramsString = searchParams.toString();
            const currentPath = window.location.pathname + (paramsString ? `?${paramsString}` : '');
            
            sessionStorage.setItem('pending_pulse_review_url', currentPath);
            router.push('/login?redirect=' + encodeURIComponent(currentPath));
            return;
        }
        // Fallback to window.location.search if Next.js searchParams is temporarily empty
        const urlParams = new URLSearchParams(window.location.search);
        let dataParam = searchParams.get('data') || urlParams.get('data');

        if (!dataParam) {
            setError("Invalid review link. Missing parameters.");
            setLoading(false);
            return;
        }

        try {
            const decodedString = atob(dataParam);
            const parsedPayload = JSON.parse(decodedString);
            setPayload(parsedPayload);

            if (!parsedPayload.weekId) {
                setError("Invalid review link data.");
                setLoading(false);
                return;
            }

            if (user.email !== parsedPayload.submittedToEmail) {
                setAccessDenied({ intendedEmail: parsedPayload.submittedToEmail });
                setLoading(false);
                return;
            }

            getPulseWeekToApprove({
                weekId: parsedPayload.weekId,
                companyId: parsedPayload.companyId,
                submittedToEmail: parsedPayload.submittedToEmail
            })
                .then(response => {
                    const pulseWeekData: PulseWeek | null = response.data.data;
                    if (!pulseWeekData) {
                        setError("Snapshot not found or you do not have permission to view it.");
                        setLoading(false);
                        return;
                    }
                    setPulseWeek(pulseWeekData);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching snapshot", err);
                    setError("Failed to load snapshot details.");
                    setLoading(false);
                });

        } catch (err) {
            console.error("Failed to decode parameters", err);
            setError("Malformed review link.");
            setLoading(false);
        }
    }, [searchParams, user, router]);

    const handleReject = () => {
        if (!pulseWeek) return;
        setRejectReason("");
        setIsRejectModalOpen(true);
    };

    const submitReject = async () => {
        if (!pulseWeek) return;
        
        if (!rejectReason.trim()) {
            toast.error('A rejection reason is required');
            return;
        }

        setActionSubmitting(true);
        try {
            await rejectPulseWeek(pulseWeek.id, { rejectReason });
            toast.success('Snapshot has been rejected');
            setPulseWeek(prev => prev ? { ...prev, status: 'REJECTED' } : null);
            setIsRejectModalOpen(false);
            setActionSubmitting(false);
        } catch (error) {
            console.error("Action submission failed:", error);
            toast.error('Failed to reject snapshot');
            setActionSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!pulseWeek) return;
        const approvedByEmail = user?.email || payload?.submittedToEmail;

        if (!approvedByEmail) {
            toast.error('Could not identify your user email');
            return;
        }

        setActionSubmitting(true);
        try {
            await approvePulseWeek(pulseWeek.id, { approvedByEmail });
            toast.success('Snapshot has been approved');
            setPulseWeek(prev => prev ? { ...prev, status: 'APPROVED' } : null);
            setActionSubmitting(false);
        } catch (error) {
            console.error("Action submission failed:", error);
            toast.error('Failed to approve snapshot');
            setActionSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full max-w-6xl mx-auto py-6 px-4 sm:px-6">
                <div className="mb-4 px-1 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Review & Approve Snapshot</h1>
                </div>
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading snapshot details...</p>
                </div>
            </div>
        );
    }
    if (accessDenied) {
        return (
            <div className="flex flex-col h-full max-w-6xl mx-auto py-6 px-4 sm:px-6">
                <div className="mb-4 px-1 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Review & Approve Snapshot</h1>
                </div>
                <Card className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <XCircle className="w-12 h-12 text-destructive" />
                    <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
                    <p className="text-muted-foreground text-center">
                        You are logged in as <strong>{user?.email}</strong>, but this snapshot was forwarded to <strong>{accessDenied.intendedEmail}</strong>.
                    </p>
                    <p className="text-muted-foreground text-center mb-2">
                        Please log in with the correct account to review this snapshot.
                    </p>
                    <div className="flex gap-4 mt-2">
                        <Button variant="outline" onClick={() => logout(window.location.pathname + window.location.search)}>Logout</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (error || !pulseWeek) {
        return (
            <div className="flex flex-col h-full max-w-6xl mx-auto py-6 px-4 sm:px-6">
                <div className="mb-4 px-1 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Review & Approve Snapshot</h1>
                </div>
                <Card className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <XCircle className="w-12 h-12 text-destructive" />
                    <h2 className="text-xl font-semibold">Error Loading Snapshot</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <div className="flex gap-4 mt-2">
                        <Button variant="outline" onClick={() => router.push('/pulse')}>Go to My Pulse</Button>
                        <Button onClick={() => logout(window.location.pathname + window.location.search)}>Logout</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto py-6 px-4 sm:px-6">
            <div className="mb-4 px-1 flex justify-between items-center">
                <h1 className="text-xl font-bold">Review & Approve Snapshot</h1>
                {/* <Button variant="ghost" size="sm" onClick={() => router.push('/pulse')} disabled={actionSubmitting}>
                    Cancel
                </Button> */}
            </div>

            <Card className="w-full gap-0">
                <CardHeader className="px-4 pb-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={pulseWeek.userProfilePicture ?? undefined} alt={pulseWeek.userFullName} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                    {getInitials(pulseWeek.userFullName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-foreground leading-tight">{pulseWeek.userFullName}</span>
                                    <span className="text-xs text-muted-foreground leading-tight mt-0.5">{pulseWeek.userEmail}</span>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-border" />
                                <div className="hidden sm:flex flex-col">
                                    <CardTitle className="flex items-center gap-2 text-sm leading-tight">
                                        {format(new Date(pulseWeek.weekStartDate), 'dd/MM/yyyy')}
                                        <ArrowRight className="w-4 h-4" />
                                        {format(new Date(pulseWeek.weekEndDate), 'dd/MM/yyyy')}
                                    </CardTitle>
                                    {pulseWeek.submittedAt && <p className="text-xs text-muted-foreground mt-1 leading-tight">Submitted {format(new Date(pulseWeek.submittedAt), 'MMM d, yyyy')}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 text-xs border rounded-md shrink-0")}>
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(pulseWeek.status) }} />
                                <span className="font-semibold">{['PENDING', 'FORWARDED'].includes(pulseWeek.status.toUpperCase()) ? (pulseWeek.status.toUpperCase() === 'FORWARDED' ? 'Forwarded' : 'Pending Approval') : toTitleCase(pulseWeek.status)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex sm:hidden flex-col mt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold leading-tight">
                            {format(new Date(pulseWeek.weekStartDate), 'dd/MM/yyyy')}
                            <ArrowRight className="w-4 h-4" />
                            {format(new Date(pulseWeek.weekEndDate), 'dd/MM/yyyy')}
                        </div>
                        {pulseWeek.submittedAt && <p className="text-xs text-muted-foreground mt-1 leading-tight">Submitted {format(new Date(pulseWeek.submittedAt), 'MMM d, yyyy')}</p>}
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 lg:px-5 lg:pt-2 border-t border-dashed">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 pt-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Synlio activity</p>
                            <p className="text-xl font-bold">{Number(pulseWeek.synlioActivityTime ?? 0).toFixed(1)}h</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Meeting time</p>
                            <p className="text-xl font-bold">{Number(pulseWeek.meetingTime ?? 0).toFixed(1)}h</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Tasks from meetings</p>
                            <p className="text-xl font-bold">{pulseWeek.taskFromMeetingCount ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Need attention</p>
                            <p className="text-xl font-bold">{pulseWeek.needAttentionCount ?? 0}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="px-4 pt-4 border-t border-dashed bg-muted/10">
                    {['PENDING', 'FORWARDED'].includes(pulseWeek.status.toUpperCase()) ? (
                        <div className="flex w-full flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 font-semibold bg-white dark:bg-gray-800 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                onClick={handleReject}
                                disabled={actionSubmitting}
                            >
                                Reject
                            </Button>
                            <Button
                                className="flex-1 font-semibold bg-[oklch(71.443%_0.12133_240.504)] text-white hover:bg-[oklch(65%_0.12133_240.504)] dark:bg-[oklch(71.443%_0.12133_240.504)] dark:hover:bg-[oklch(65%_0.12133_240.504)] dark:text-white cursor-pointer"
                                onClick={handleApprove}
                                disabled={actionSubmitting}
                            >
                                {actionSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Approve
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full justify-center py-4 gap-4">
                            <p className="text-sm font-medium text-muted-foreground text-center">
                                This snapshot has been <strong className={pulseWeek.status.toUpperCase() === 'APPROVED' ? 'text-emerald-500' : 'text-destructive'}>{toTitleCase(pulseWeek.status)}</strong>.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/pulse')}
                            >
                                Go to My Pulse
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>

            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Weekly Snapshot</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rejectReason" className="text-sm font-medium mb-2 block">
                            Reason for Rejection <span className="text-destructive">*</span>
                        </Label>
                        <Textarea 
                            id="rejectReason" 
                            placeholder="Please explain why you are rejecting this snapshot..." 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="min-h-[100px] resize-none"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsRejectModalOpen(false)}
                            disabled={actionSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={submitReject}
                            disabled={actionSubmitting}
                        >
                            {actionSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const ReviewPage = () => {
    return (
        <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <ReviewContent />
        </Suspense>
    );
};

export default ReviewPage;
