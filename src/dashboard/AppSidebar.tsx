import React, { useState, useEffect, ReactNode } from "react";
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Typography,
  CssBaseline,
  ListItemButton,
  Menu,
  MenuItem as MuiMenuItem,
  Avatar,
  Tooltip,
  useMediaQuery,
  useTheme,
  AppBar, // Added AppBar for mobile
  Toolbar // Added Toolbar for mobile
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft,
  Dashboard,
  People,
  Settings,
  Receipt,
  BarChart,
  Logout,
  PointOfSale,
  AccountCircle,
  ExpandMore,
  Group as GroupIcon,
  Build as BuildIcon,
  Payment as PaymentIcon,
  MonetizationOn as MonetizationOnIcon,
} from "@mui/icons-material";
import logo from '../assets/logos/carwash-logo.png';
import { useNavigate } from "react-router-dom";

const drawerWidth = 260; // Slightly wider for better spacing
const collapsedWidth = 72; // Slightly wider for icon visibility

interface AppSidebarProps {
  role: "admin" | "cashier";
  firstName?: string;
  lastName?: string;
  onLogout?: () => void;
  onProfile?: () => void;
  children?: ReactNode;
}

// Enhanced menu structure with route paths
const adminMenu = [
  {
    section: "Main",
    items: [
      { text: "Dashboard", icon: <Dashboard />, path: "/admin" },
      { text: "Reports & Analytics", icon: <BarChart />, path: "/admin/reports" },
      { text: "Sales Transactions", icon: <Receipt />, path: "/admin/sales-transactions" },
      { text: "Loyalty Program", icon: <People />, path: "/admin/loyalty-program" },
      { text: "Commissions", icon: <MonetizationOnIcon />, path: "/commissions" }
    ]
  },
  {
    section: "Management",
    items: [
      { text: "User Management", icon: <People />, path: "/admin/users" },
      { text: "Employee Management", icon: <GroupIcon />, path: "/admin/employees" },
      { text: "Service Management", icon: <BuildIcon />, path: "/admin/services" },
      { text: "Chemicals Inventory", icon: <BuildIcon color="secondary" />, path: "/admin/chemicals" }
    ]
  }
];

const cashierMenu = [
  {
    section: "Main",
    items: [
      { text: "Dashboard", icon: <Dashboard />, path: "/cashier" },
      { text: "Payment & Services", icon: <PaymentIcon />, path: "/cashier/payment-services" },
      { text: "Loyalty Program", icon: <People />, path: "/cashier/loyalty-program" },
      { text: "Sales Transactions", icon: <PointOfSale />, path: "/cashier/sales-transactions" },
      { text: "Daily Summary", icon: <Receipt />, path: "/cashier/daily-summary" },
      { text: "Commissions", icon: <MonetizationOnIcon />, path: "/commissions" }
    ]
  }
];

const SIDEBAR_PREF_KEY = "sidebarOpen";

const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  firstName: propFirstName = '',
  lastName: propLastName = '',
  onLogout,
  onProfile,
  children
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(() => {
    // Default to open on desktop, closed on mobile
    const pref = localStorage.getItem(SIDEBAR_PREF_KEY);
    return isMobile ? false : (pref === null ? true : pref === "true");
  });
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("");

  const [userInfo, setUserInfo] = useState<{ firstName: string, lastName: string }>({
    firstName: propFirstName,
    lastName: propLastName
  });

  useEffect(() => {
    const stored = localStorage.getItem("userInfo");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserInfo({
          firstName: parsed.firstName || "",
          lastName: parsed.lastName || ""
        });
      } catch {
        setUserInfo({ firstName: propFirstName, lastName: propLastName });
      }
    } else {
      setUserInfo({ firstName: propFirstName, lastName: propLastName });
    }

    // Set active item based on current path
    const currentPath = window.location.pathname;
    const allMenuItems = [...adminMenu, ...cashierMenu].flatMap(section => section.items);
    const activeMenuItem = allMenuItems.find(item => item.path === currentPath);
    if (activeMenuItem) {
      setActiveItem(activeMenuItem.text);
    }
  }, [propFirstName, propLastName, role]);

  useEffect(() => {
    // Only save preference if not on mobile
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_PREF_KEY, String(open));
    }
  }, [open, isMobile]);

  // Handle sidebar behavior based on mobile state
  useEffect(() => {
    if (isMobile) {
      setOpen(false); // Always start closed on mobile
    } else {
      const pref = localStorage.getItem(SIDEBAR_PREF_KEY);
      setOpen(pref === null ? true : pref === "true"); // Respect preference on desktop
    }
  }, [isMobile]);

  const handleMenuClick = (item: { text: string; path: string }) => {
    setActiveItem(item.text);
    navigate(item.path);
    if (isMobile) {
      setOpen(false); // Close sidebar on mobile after navigation
    }
  };

  const menu = role === "admin" ? adminMenu : cashierMenu;
  const firstName = userInfo.firstName || propFirstName;
  const lastName = userInfo.lastName || propLastName;
  const userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleProfileClick = () => {
    handleCloseUserMenu();
    if (onProfile) onProfile();
  };

  const handleLogoutClick = () => {
    handleCloseUserMenu();
    if (onLogout) onLogout();
  };

  const toggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <CssBaseline />

      {/* Mobile AppBar with Menu Button */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            width: '100%',
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[1],
            height: 64, // Standard app bar height
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={toggleSidebar}
              edge="start"
              sx={{ mr: 2, color: "text.primary" }}
            >
              <MenuIcon />
            </IconButton>
            <Box
              component="img"
              src={logo}
              alt="Logo"
              sx={{
                height: 36,
                mr: 1,
                objectFit: "contain",
              }}
            />
            <Typography variant="h6" noWrap component="div"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                letterSpacing: 1,
                whiteSpace: "nowrap"
              }}>
              MAD
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            overflowX: 'hidden',
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            background: theme.palette.background.paper, // Use theme background
            borderRight: `1px solid ${theme.palette.divider}`, // Use theme divider
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            boxShadow: isMobile ? theme.shadows[4] : 'none', // Add shadow for temporary drawer
            top: isMobile ? 64 : 0, // Position below app bar on mobile
            height: isMobile ? 'calc(100% - 64px)' : '100vh', // Adjust height on mobile
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
      >
        {/* Logo Section */}
        {!isMobile && ( // Hide logo section when mobile app bar is present
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "flex-start" : "center",
              p: open ? "20px 24px 12px 24px" : "20px 12px 12px 12px",
              borderBottom: `1px solid ${theme.palette.divider}`,
              minHeight: 72,
              animation: open ? 'fadeIn 0.5s ease-out' : 'fadeOut 0.3s ease-in',
              '@keyframes fadeIn': {
                'from': { opacity: 0 },
                'to': { opacity: 1 },
              },
              '@keyframes fadeOut': {
                'from': { opacity: 1 },
                'to': { opacity: 0 },
              }
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="Logo"
              sx={{
                height: 40,
                width: open ? "auto" : 40,
                borderRadius: 1,
                objectFit: "contain",
                transition: "width 0.3s ease-in-out"
              }}
            />
            {open && (
              <Typography variant="h6" sx={{
                ml: 2,
                fontWeight: 700,
                color: "primary.main",
                letterSpacing: 1,
                whiteSpace: "nowrap",
                opacity: 0, // Start with 0 opacity for animation
                animation: 'slideIn 0.4s forwards',
                animationDelay: '0.1s',
                '@keyframes slideIn': {
                  'from': { transform: 'translateX(-20px)', opacity: 0 },
                  'to': { transform: 'translateX(0)', opacity: 1 },
                },
              }}>
                MAD
              </Typography>
            )}
          </Box>
        )}

        {/* Main Menu */}
        <Box sx={{
          flexGrow: 1,
          overflowY: "auto",
          pt: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.action.hover, // Use theme for scrollbar track
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.grey[500], // Use theme for scrollbar thumb
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: theme.palette.grey[700], // Use theme for scrollbar thumb hover
          }
        }}>
          {menu.map((section, idx) => (
            <Box key={`${section.section}-${idx}`} sx={{ my: 1 }}>
              {open && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 700,
                    letterSpacing: 1,
                    pl: 3,
                    pb: 0.5,
                    display: "block",
                    textTransform: 'uppercase', // Make section titles uppercase
                    animation: 'fadeIn 0.5s ease-out',
                  }}
                >
                  {section.section}
                </Typography>
              )}
              <List sx={{ py: 0 }}>
                {section.items.map((item) => (
                  <Tooltip
                    key={item.text}
                    title={!open ? item.text : ""}
                    placement="right"
                    arrow
                    sx={{ [`& .MuiTooltip-tooltip`]: { fontSize: 13 } }}
                  >
                    <ListItemButton
                      sx={{
                        minHeight: 48, // Slightly taller for better touch targets
                        justifyContent: open ? 'initial' : 'center',
                        px: open ? 3 : 1.5,
                        borderRadius: 2, // More rounded corners
                        my: 0.5,
                        mx: 1,
                        transition: "all 0.2s ease-in-out", // Smooth transition for all properties
                        backgroundColor: activeItem === item.text ? theme.palette.primary.light : "transparent",
                        color: activeItem === item.text ? theme.palette.primary.main : theme.palette.text.primary,
                        "&:hover": {
                          backgroundColor: activeItem === item.text ? theme.palette.primary.light : theme.palette.action.hover,
                          transform: 'translateX(4px)', // Slight slide animation on hover
                        },
                        "&.Mui-selected": { // Ensure selected state looks good
                          backgroundColor: theme.palette.primary.light,
                          color: theme.palette.primary.main,
                          "&:hover": {
                            backgroundColor: theme.palette.primary.light,
                          }
                        }
                      }}
                      onClick={() => handleMenuClick(item)}
                      selected={activeItem === item.text} // Use selected prop for better styling control
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: open ? 2 : 'auto',
                          justifyContent: 'center',
                          color: activeItem === item.text ? theme.palette.primary.main : theme.palette.action.active,
                          transition: 'color 0.2s ease-in-out',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={{
                          opacity: open ? 1 : 0,
                          transition: "opacity 0.3s ease-in-out",
                          whiteSpace: "nowrap"
                        }}
                        primaryTypographyProps={{
                          fontWeight: activeItem === item.text ? 600 : 500, // Bolder for active item
                          fontSize: 15, // Slightly larger font size
                          color: activeItem === item.text ? theme.palette.primary.main : theme.palette.text.primary
                        }}
                      />
                    </ListItemButton>
                  </Tooltip>
                ))}
              </List>
              {idx < menu.length - 1 && (
                <Divider sx={{ mx: open ? 2 : 1.5, my: 2 }} /> // More vertical spacing for dividers
              )}
            </Box>
          ))}
        </Box>

        {/* User Menu Section */}
        <Box
          sx={{
            p: open ? 2 : 1,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: "flex",
            flexDirection: open ? "row" : "column",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            minHeight: 70,
            background: theme.palette.background.paper,
            transition: 'all 0.3s ease-in-out',
          }}
        >
          <Tooltip title={open ? "" : `${firstName} ${lastName}`} placement="right" arrow>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: open ? "100%" : "auto",
                cursor: "pointer",
                '&:hover': {
                  opacity: 0.8, // Subtle hover effect
                }
              }}
              onClick={handleUserMenuOpen}
            >
              <Avatar
                sx={{
                  width: 40, // Slightly larger avatar
                  height: 40,
                  bgcolor: theme.palette.primary.main,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16, // Larger font for initials
                  mr: open ? 2 : 0,
                  transition: 'margin 0.3s ease-in-out',
                  boxShadow: theme.shadows[1], // Add a subtle shadow to the avatar
                }}
              >
                {userInitials}
              </Avatar>
              {open && (
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                    {firstName} {lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {role === "admin" ? "Administrator" : "Cashier"} {/* More descriptive role */}
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>
          {open && (
            <IconButton
              size="small"
              onClick={handleUserMenuOpen}
              sx={{ ml: 1, transition: 'transform 0.3s ease-in-out', '&:hover': { transform: 'scale(1.1)' } }}
              aria-label="User menu"
            >
              <ExpandMore />
            </IconButton>
          )}
        </Box>

        {/* User Menu Dropdown */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleCloseUserMenu}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          PaperProps={{
            elevation: 3,
            sx: {
              minWidth: 180,
              borderRadius: 2,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <MuiMenuItem onClick={handleProfileClick}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </MuiMenuItem>
          <Divider />
          <MuiMenuItem onClick={handleLogoutClick}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MuiMenuItem>
        </Menu>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: isMobile ? '100%' : `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          background: theme.palette.background.default, // Use theme background
          minHeight: "100vh",
          // Adjust margin-left based on sidebar state and mobile
          marginLeft: isMobile ? 0 : `${open ? drawerWidth : collapsedWidth}px`,
          mt: isMobile ? '64px' : 0, // Add top margin on mobile to account for AppBar
          position: "relative",
        }}
      >
        {/* Collapse Button (visible only on desktop) */}
        {!isMobile && (
          <IconButton
            onClick={toggleSidebar}
            sx={{
              position: "fixed",
              top: 16,
              left: open ? drawerWidth - 12 : collapsedWidth - 12,
              zIndex: theme.zIndex.drawer + 1, // Ensure button is above content
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.secondary,
              boxShadow: theme.shadows[2],
              transition: "left 0.3s ease-in-out, transform 0.3s ease-in-out",
              "&:hover": {
                backgroundColor: theme.palette.background.paper,
                transform: "scale(1.1)",
                color: theme.palette.primary.main,
              },
              transform: open ? "rotate(0deg)" : "rotate(180deg)",
            }}
            size="medium"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronLeft />
          </IconButton>
        )}

        {children}
      </Box>
    </Box>
  );
};

export default AppSidebar;