import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { STRENGTH_DETAILS } from '../../shared/cliftonStrengths';
import './CliftonStrengthsDisplay.css';

interface CliftonStrengthsDisplayProps {
  userId: string;
  compact?: boolean; // For sidebar display
}

interface StrengthsData {
  id: string;
  userId: string;
  topStrengths: string[];
}

const CliftonStrengthsDisplay: React.FC<CliftonStrengthsDisplayProps> = ({ userId, compact = false }) => {
  const [strengths, setStrengths] = useState<StrengthsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [hoveredStrength, setHoveredStrength] = useState<string | null>(null);

  const fetchStrengths = React.useCallback(async (showLoading = false) => {
    try {
      // Only show loading state on initial load or when explicitly requested
      if (showLoading) {
        setLoading(true);
      }
      
      const sessionId = localStorage.getItem('sessionId');
      
      // Use /me endpoint which uses the authenticated user's ID from session
      const response = await fetch(`${API_BASE_URL}/api/clifton-strengths/me`, {
        headers: { 'x-session-id': sessionId || '' },
        cache: 'no-cache',
      });

      if (response.ok) {
        const data = await response.json();
        // Only set strengths if data exists and has topStrengths
        if (data && data.topStrengths && Array.isArray(data.topStrengths) && data.topStrengths.length > 0) {
          // Only update if data has actually changed to prevent unnecessary re-renders
          setStrengths(prev => {
            if (!prev) {
              return data; // First time loading
            }
            // Check if data has changed
            const strengthsChanged = JSON.stringify(prev.topStrengths) !== JSON.stringify(data.topStrengths);
            const idChanged = prev.id !== data.id;
            
            if (strengthsChanged || idChanged) {
              return data; // Data changed, update
            }
            return prev; // No change, keep previous to prevent re-render
          });
        } else {
          // Only set to null if we had strengths before (to prevent flicker)
          setStrengths(prev => {
            if (prev === null) return null; // Already null, no change
            return null; // Changed from having strengths to none
          });
        }
      } else if (response.status === 404) {
        // No strengths found for this user - this is normal
        setStrengths(prev => {
          if (prev === null) return null; // Already null, no change
          return null; // Changed from having strengths to none
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[CliftonStrengthsDisplay] Error response:', response.status, errorData);
        // Don't clear strengths on error, keep showing what we have
      }
    } catch (error) {
      console.error('[CliftonStrengthsDisplay] Failed to fetch strengths:', error);
      // Don't clear strengths on error, keep showing what we have
    } finally {
      if (showLoading) {
        setLoading(false);
        setHasInitiallyLoaded(true);
      }
    }
  }, [userId]);

  // Initial load - only once when component mounts or userId changes
  useEffect(() => {
    if (!hasInitiallyLoaded) {
      fetchStrengths(true); // Show loading on initial load
    }
  }, [userId, hasInitiallyLoaded, fetchStrengths]);

  // Listen for storage events to refresh when strengths are updated
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cliftonStrengthsUpdated' && e.newValue === userId) {
        // Refresh strengths when updated (silently, without loading state)
        fetchStrengths(false);
        // Clear the flag
        localStorage.removeItem('cliftonStrengthsUpdated');
      }
    };

    // Listen for custom event for same-tab updates
    const handleStrengthsUpdate = (e: CustomEvent) => {
      if (e.detail?.userId === userId) {
        // Refresh strengths when updated (silently, without loading state)
        fetchStrengths(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cliftonStrengthsUpdated' as any, handleStrengthsUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cliftonStrengthsUpdated' as any, handleStrengthsUpdate as EventListener);
    };
  }, [userId, fetchStrengths]);

  // Poll periodically to catch updates (every 1 second for real-time updates)
  // But do it silently without showing loading state
  useEffect(() => {
    // Only start polling after initial load
    if (!hasInitiallyLoaded) return;
    
    const interval = setInterval(() => {
      fetchStrengths(false); // Silent refresh
    }, 1000); // Refresh every 1 second

    return () => clearInterval(interval);
  }, [hasInitiallyLoaded, fetchStrengths]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!strengths || !strengths.topStrengths || strengths.topStrengths.length === 0) {
    return null; // Don't show if no strengths
  }

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Executing':
        return '#10b981'; // Emerald green
      case 'Influencing':
        return '#f59e0b'; // Amber
      case 'Relationship Building':
        return '#3b82f6'; // Blue
      case 'Strategic Thinking':
        return '#8b5cf6'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  };

  if (compact) {
    // Compact sidebar display
    return (
      <div className="clifton-strengths-sidebar">
        <div className="strengths-header">
          <span className="strengths-title">My Strengths</span>
        </div>
        <div className="strengths-list-compact">
          {strengths.topStrengths.map((strength, index) => {
            const details = STRENGTH_DETAILS[strength];
            const categoryColor = details ? getCategoryColor(details.category) : '#6b7280';
            
            return (
              <div
                key={index}
                className="strength-item-compact"
                style={{ borderLeftColor: categoryColor }}
                onMouseEnter={() => setHoveredStrength(strength)}
                onMouseLeave={() => setHoveredStrength(null)}
              >
                <span className="strength-name-compact">{strength}</span>
                {hoveredStrength === strength && details && (
                  <div className="strength-tooltip">
                    <div className="tooltip-category" style={{ color: categoryColor }}>
                      {details.category}
                    </div>
                    <div className="tooltip-description">{details.description}</div>
                    <div className="tooltip-quote">"{details.quote}"</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full display (for settings or other pages)
  return (
    <div className="clifton-strengths-full">
      <h3>CliftonStrengths</h3>
      <div className="strengths-grid">
        {strengths.topStrengths.map((strength, index) => {
          const details = STRENGTH_DETAILS[strength];
          const categoryColor = details ? getCategoryColor(details.category) : '#6b7280';
          
          return (
            <div
              key={index}
              className="strength-card"
              style={{ borderTopColor: categoryColor }}
            >
              <div className="strength-rank">#{index + 1}</div>
              <div className="strength-name">{strength}</div>
              {details && (
                <>
                  <div className="strength-category" style={{ color: categoryColor }}>
                    {details.category}
                  </div>
                  <div className="strength-description">{details.description}</div>
                  <div className="strength-quote">"{details.quote}"</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CliftonStrengthsDisplay;

