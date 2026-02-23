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
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 991 : false,
  );
  const isActive = !!useMatch({ path: resolvedPath.pathname });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (window.innerWidth > 991) {
      setIsOpen(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth > 991) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (window.innerWidth <= 991) {
      setIsOpen((prev) => !prev);
    }
  }, []);

  // Close dropdown when mobile menu closes
  useEffect(() => {
    if (!isMobileMenuOpen && isOpen && isMobile) {
      const timer = setTimeout(() => setIsOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen, isOpen, isMobile]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 991);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <li
      className={`${styles.adminDropdownItem} ${isMobile ? styles.mobile : ''}`}
    >
      <div
        className={styles.adminDropdownWrapper}
        ref={dropdownRef}
        onMouseEnter={handleMouseEnter}
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
          onClick={handleClick}
          type={ButtonType.button}
          aria-expanded={isOpen}
        >
          {text}
          <BsChevronDown
            className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
            size={16}
          />
        </button>

        {isOpen && <ul className={styles.dropdownMenu}>{children}</ul>}
      </div>
    </li>
  );
};
