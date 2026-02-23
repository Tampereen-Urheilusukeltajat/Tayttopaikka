import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { ButtonType } from '../common/Button/Buttons';
import styles from './Navbar.module.scss';
import { useMatch, useResolvedPath } from 'react-router-dom';
import { BsChevronDown } from 'react-icons/bs';

type AdminDropdownButtonProps = PropsWithChildren & {
  disabled?: boolean;
  key?: string;
  text: string;
  isMobileMenuOpen?: boolean;
};

export const AdminDropdown: React.FC<AdminDropdownButtonProps> = ({
  children,
  disabled,
  key,
  text,
  isMobileMenuOpen,
}) => {
  const resolvedPath = useResolvedPath('/admin/*');

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isActive = !!useMatch({ path: resolvedPath.pathname });

  const onDropdownButtonClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  // Close dropdown when mobile menu closes
  useEffect(() => {
    if (!isMobileMenuOpen && isOpen) {
      // Use setTimeout to defer state update to next tick
      const timer = setTimeout(() => setIsOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen, isOpen]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 991);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <li
      className={`${styles.adminDropdownItem} ${isMobile ? styles.mobile : ''}`}
    >
      <div
        className={styles.adminDropdownWrapper}
        ref={dropdownRef}
        onMouseLeave={handleMouseLeave}
      >
        <button
          id={'dropdownMenuLink'}
          className={`
            ${styles.dropdownButton}
            ${isActive ? styles.active : ''} 
            ${isOpen ? styles.open : ''}
          `}
          disabled={disabled}
          key={key}
          onClick={onDropdownButtonClick}
          type={ButtonType.button}
          aria-expanded={isOpen}
        >
          {text}
          <BsChevronDown
            className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
            size={16}
          />
        </button>

        {isOpen && <div className={styles.dropdownMenu}>{children}</div>}
      </div>
    </li>
  );
};
