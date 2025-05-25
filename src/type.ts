export type Coord = [number, number];

export type CoordsMap = {
  face_keypoints_2d: Coord;
  pose_keypoints_2d: Coord;
  hand_left_keypoints_2d: Coord;
  hand_right_keypoints_2d: Coord;
};