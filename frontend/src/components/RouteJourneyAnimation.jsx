import React, { useState, useEffect } from 'react';
import { Clock, Bus } from 'lucide-react';

export default function RouteJourneyAnimation({ durationMins, distanceKm, delay = 0 }) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 1200 + delay * 100);
    return () => clearTimeout(timer);
  }, [delay]);

  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;

  return (
    <div
      className="journey-animation-track"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Hover to replay bus journey animation"
    >
      {/* Route Info Badge (Duration & Distance) - pops in after bus arrives */}
      <div className={`journey-info-badge ${hasAnimated ? 'show-info' : 'revealing'}`}>
        <div className="journey-duration">
          <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
          <span>{hours}h {mins > 0 ? `${mins}m` : ''}</span>
        </div>
        <div className="journey-distance">
          {distanceKm} km
        </div>
      </div>

      {/* Road / Transit Track */}
      <div className="transit-road">
        {/* Road Base Track with dashed markings */}
        <div className="road-dashed-line" />

        {/* Progress Track filling up as the bus drives */}
        <div className={`road-progress-fill ${isHovered ? 'replay-drive' : ''}`} />

        {/* Animated Moving Bus */}
        <div className={`driving-bus-sprite ${isHovered ? 'replay-drive' : ''}`}>
          <div className="bus-motion-wrapper">
            <span className="bus-emoji-vehicle">🚌</span>
            <div className="bus-exhaust-smoke" />
          </div>
        </div>
      </div>

      {/* Start and End Destination Dots */}
      <div className="road-terminal-dot left" />
      <div className="road-terminal-dot right" />
    </div>
  );
}
