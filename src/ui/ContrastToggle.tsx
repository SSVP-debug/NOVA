import { useContrast } from '@/app/contrast';
import { Icon } from './icons';

/** On/off switch for high contrast (black text on white, thicker borders). Sits next to the NOVA logo on every screen. */
export function ContrastToggle() {
  const { on, toggle } = useContrast();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="High contrast"
      title={on ? 'High contrast is on. Press to turn it off.' : 'Turn on high contrast: black text on white, thicker borders.'}
      className={`contrast-toggle ${on ? 'on' : ''}`}
      onClick={toggle}
    >
      <Icon name="contrast" size={20} />
      <span className="ct-track" aria-hidden="true"><i /></span>
    </button>
  );
}
