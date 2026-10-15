import { avatarColor, avatarLetter } from '../utils';

interface Props {
  seed: string;
  title: string;
  size?: number;
}

export default function Avatar({ seed, title, size = 48 }: Props) {
  return (
    <div
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(seed) }}
    >
      {avatarLetter(title)}
    </div>
  );
}
