import React from 'react';
import type { Coord, CoordsMap } from '../type';

const CoordinateDisplay: React.FC<{ coords: CoordsMap }> = ({ coords }) => (
  <div style={{ padding: '1em' }}>
    {(Object.entries(coords) as [keyof CoordsMap, Coord][]).map(([key, [x, y]]) => (
      <div key={key}>
        {key}: [{x}, {y}]
      </div>
    ))}
  </div>
);

export default CoordinateDisplay;
