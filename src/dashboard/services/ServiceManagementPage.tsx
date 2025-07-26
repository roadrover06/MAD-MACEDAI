import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Stack,
  useMediaQuery,
  useTheme,
  Autocomplete,
  createTheme, // Import createTheme for consistency
  ThemeProvider, // Import ThemeProvider
  CssBaseline, // Import CssBaseline
  CircularProgress, // For loading states
  Skeleton, // For loading states
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  LocalCarWash as LocalCarWashIcon, // Icon for services
  Science as ScienceIcon, // Icon for chemicals
  Close as CloseIcon, // For dialog close buttons
  Check as CheckIcon, // For dialog save buttons
  Refresh as RefreshIcon, // For refresh button
} from "@mui/icons-material";
import AppSidebar from "../AppSidebar";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { motion } from "framer-motion"; // Import motion for animations
import { getAllLocal, setLocal, deleteLocal, queueSync, onSyncStatus } from "../../utils/offlineSync";
import { isOnline } from "../../firebase/firebase";

// Custom Material-UI Theme for consistent styling
const theme = createTheme({
  typography: {
    fontFamily: '"Inter", sans-serif',
    h3: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 800,
      letterSpacing: 1.5,
    },
    h4: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 800,
      letterSpacing: 1.5,
    },
    h5: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 700,
      letterSpacing: 1.2,
    },
    h6: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
    },
    button: {
      textTransform: 'none',
    },
  },
  palette: {
    primary: {
      main: '#ef5350',
      light: '#ff8a80',
      dark: '#d32f2f',
    },
    secondary: {
      main: '#424242',
    },
    background: {
      default: '#f0f2f5',
      paper: 'rgba(255,255,255,0.95)',
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#2E7D32',
    },
    info: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2',
    },
    warning: {
      main: '#FFC107',
      light: '#FFD54F',
      dark: '#FF8F00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
          '&:hover': {
            boxShadow: '0 12px 35px rgba(0,0,0,0.15)',
            transform: 'translateY(-5px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          textTransform: 'none',
          fontWeight: 700,
          letterSpacing: 0.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.8)',
            '& fieldset': {
              borderColor: '#e0e0e0',
              transition: 'border-color 0.3s ease-in-out',
            },
            '&:hover fieldset': {
              borderColor: '#ffab91',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ef5350',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#666',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#ef5350',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,0.8)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e0e0e0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ffab91',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ef5350',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '24px',
          boxShadow: '0 15px 45px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f5f5',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#333',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
          backgroundColor: '#e0e0e0',
        },
        bar: {
          borderRadius: 4,
          backgroundColor: '#ef5350',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          fontWeight: 500,
        },
      },
    },
  },
});

const VARIETIES = [
  { key: "motor", label: "Motor", sub: ["Single Motor", "Big Bike"] },
  { key: "small", label: "Small", sub: ["Sedan/Hatchback"] },
  { key: "medium", label: "Medium", sub: ["AUV/MPV/Crossover"] },
  { key: "large", label: "Large", sub: ["SUV", "Pick-up", "Mid-size SUV"] },
  { key: "xlarge", label: "X-Large", sub: ["Van/Truck"] }
];

interface Service {
  id: string;
  name: string;
  description: string;
  prices: { [variety: string]: number };
  chemicals?: {
    [chemicalId: string]: {
      name: string;
      usage: { [variety: string]: number }; // e.g. { small: 120, medium: 150, ... }
    }
  };
}

interface ServiceManagementPageProps {
  onLogout?: () => void;
  onProfile?: () => void;
  firstName?: string;
  lastName?: string;
}

// Fix: define a type for chemicals used in service dialog
type ServiceChemical = {
  chemicalId: string;
  name: string;
  usage: { [variety: string]: number };
};

const peso = (v: number) => `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`; // Ensure 2 decimal places

const getServices = async (): Promise<Service[]> => {
  const snapshot = await getDocs(collection(db, "services"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
};
const addService = async (service: Omit<Service, "id">) => {
  // Ensure chemicals is included if present
  await addDoc(collection(db, "services"), {
    ...service,
    chemicals: service.chemicals ? service.chemicals : undefined
  });
};
const updateService = async (service: Service) => {
  // Ensure chemicals is included if present
  await updateDoc(doc(db, "services", service.id), {
    name: service.name,
    description: service.description,
    prices: service.prices,
    chemicals: service.chemicals ? service.chemicals : undefined
  });
};
const deleteService = async (id: string) => {
  await deleteDoc(doc(db, "services", id));
};

const ServiceManagementPage: React.FC<ServiceManagementPageProps> = ({
  onLogout,
  onProfile,
  firstName,
  lastName
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true); // Added loading state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [newService, setNewService] = useState<{ name: string; description: string; prices: { [variety: string]: number } }>({
    name: "",
    description: "",
    prices: VARIETIES.reduce((acc, v) => ({ ...acc, [v.key]: 0 }), {})
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "info" });
  const [search, setSearch] = useState("");
  const [varietyTab, setVarietyTab] = useState(0); // 0 = All, 1... = per variety
  const [chemicals, setChemicals] = useState<{ id: string; name: string }[]>([]);
  const [newServiceChemicals, setNewServiceChemicals] = useState<ServiceChemical[]>([]);
  const [editServiceChemicals, setEditServiceChemicals] = useState<ServiceChemical[]>([]);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Validation states for Add/Edit forms
  const [addFormErrors, setAddFormErrors] = useState({ name: false, description: false });
  const [editFormErrors, setEditFormErrors] = useState({ name: false, description: false });


  const currentTheme = useTheme(); // Use currentTheme to access theme properties
  const isSm = useMediaQuery(currentTheme.breakpoints.down("sm"));
  const isMd = useMediaQuery(currentTheme.breakpoints.down("md"));

  useEffect(() => {
    fetchData(); // Combined fetches
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchServices(),
        fetchChemicals()
      ]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setSnackbar({ open: true, message: "Failed to load data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- Unified fetch for online/offline ---
  const fetchServices = async () => {
    setLoading(true);
    try {
      let servicesData: Service[] = [];
      if (isOnline()) {
        // Online: get from Firestore
        const snapshot = await getDocs(collection(db, "services"));
        servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
        // Merge in local services not yet synced
        try {
          const localServices = await getAllLocal("services") as Service[] || [];
          for (const local of localServices) {
            const match = servicesData.find(s =>
              s.name === local.name &&
              s.description === local.description
            );
            if (!match) servicesData.push(local);
          }
        } catch {}
      } else {
        // Offline: load from IndexedDB only
        servicesData = await getAllLocal("services") as Service[] || [];
      }
      setServices(servicesData);
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to load services", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchChemicals = async () => {
    const snapshot = await getDocs(collection(db, "chemicals"));
    setChemicals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as { id: string; name: string }[]);
  };

  // Filter by search and variety
  const filteredServices = services.filter(service => {
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase());
    if (varietyTab === 0) return matchesSearch;
    const varietyKey = VARIETIES[varietyTab - 1].key;
    // Only show if price for this variety is > 0
    return matchesSearch && service.prices && typeof service.prices[varietyKey] === "number" && service.prices[varietyKey] > 0;
  });

  // --- Add service: support offline ---
  const handleAddService = async () => {
    const errors = {
      name: !newService.name.trim(),
      description: false,
    };
    setAddFormErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      setSnackbar({ open: true, message: "Please fill in all required fields.", severity: "error" });
      return;
    }

    try {
      const serviceObj = {
        ...newService,
        description: newService.description ?? "",
        chemicals: Object.fromEntries(
          newServiceChemicals.map(c => [
            c.chemicalId,
            { name: c.name, usage: c.usage }
          ])
        )
      };
      if (isOnline()) {
        await addDoc(collection(db, "services"), serviceObj);
      } else {
        const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await setLocal("services", { ...serviceObj, id: newId });
        await queueSync("add", "services", { ...serviceObj, id: newId });
      }
      setSnackbar({ open: true, message: "Service added successfully!", severity: "success" });
      setAddDialogOpen(false);
      setNewService({ name: "", description: "", prices: VARIETIES.reduce((acc, v) => ({ ...acc, [v.key]: 0 }), {}) });
      setNewServiceChemicals([]);
      setAddFormErrors({ name: false, description: false });
      fetchServices();
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to add service", severity: "error" });
    }
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setEditServiceChemicals(
      service.chemicals
        ? Object.entries(service.chemicals).map(([chemicalId, c]) => ({
            chemicalId,
            name: c.name,
            usage: c.usage
          }))
        : []
    );
    setEditFormErrors({ name: false, description: false }); // Reset errors
    setEditDialogOpen(true);
  };

  // --- Edit service: support offline ---
  const handleUpdateService = async () => {
    if (!selectedService) return;
    const errors = {
      name: !selectedService.name.trim(),
      description: false,
    };
    setEditFormErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      setSnackbar({ open: true, message: "Please fill in all required fields.", severity: "error" });
      return;
    }

    try {
      const serviceObj = {
        ...selectedService,
        description: selectedService.description ?? "",
        chemicals: Object.fromEntries(
          editServiceChemicals.map(c => [
            c.chemicalId,
            { name: c.name, usage: c.usage }
          ])
        )
      };
      if (isOnline()) {
        await updateDoc(doc(db, "services", selectedService.id), serviceObj);
      } else {
        await setLocal("services", serviceObj);
        await queueSync("update", "services", serviceObj);
      }
      setSnackbar({ open: true, message: "Service updated successfully!", severity: "success" });
      setEditDialogOpen(false);
      setSelectedService(null);
      setEditServiceChemicals([]);
      setEditFormErrors({ name: false, description: false }); // Reset errors
      fetchServices();
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to update service", severity: "error" });
    }
  };

  const handleDeleteService = (service: Service) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  // --- Delete service: support offline ---
  const confirmDeleteService = async () => {
    if (!selectedService) return;
    try {
      if (isOnline()) {
        await deleteDoc(doc(db, "services", selectedService.id));
      } else {
        await deleteLocal("services", selectedService.id);
        await queueSync("delete", "services", { id: selectedService.id });
      }
      setSnackbar({ open: true, message: "Service deleted successfully!", severity: "success" });
      setDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to delete service", severity: "error" });
    }
  };

  // Helper: convert Autocomplete value (array of {id, name}) to ServiceChemical[]
  function handleChemicalsChange(
    value: { id: string; name: string }[],
    prev: ServiceChemical[]
  ): ServiceChemical[] {
    return value.map(opt => {
      const found = prev.find(c => c.chemicalId === opt.id);
      return found
        ? found
        : { chemicalId: opt.id, name: opt.name, usage: VARIETIES.reduce((acc, v) => ({ ...acc, [v.key]: 0 }), {}) }; // Initialize usage
    });
  }

  // Stats
  const totalServices = services.length;
  const totalChemicals = chemicals.length;

  // Framer Motion variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  const statCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
    hover: { scale: 1.03, boxShadow: currentTheme.shadows[6] }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppSidebar
        role="admin"
        firstName={firstName}
        lastName={lastName}
        onLogout={onLogout}
        onProfile={onProfile}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            mt: { xs: 2, sm: 3, md: 4 },
            px: { xs: 2, sm: 3, md: 4 },
            pb: 4,
            width: "100%",
            minHeight: "calc(100vh - 64px)",
            boxSizing: "border-box",
            transition: "margin-left 0.3s",
          }}
        >
          {/* Show syncing offline data message */}
          {syncingOffline && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CircularProgress color="info" size={24} />
                <Typography color="info.main" sx={{ fontWeight: 600 }}>
                  Syncing offline data to Firebase...
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Header Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Paper
              elevation={4}
              sx={{
                p: { xs: 2.5, sm: 4 },
                mb: 4,
                borderRadius: 4,
                boxShadow: currentTheme.shadows[6],
                background: `linear-gradient(135deg, ${currentTheme.palette.info.light} 0%, ${currentTheme.palette.info.main} 100%)`, // Info gradient
                color: currentTheme.palette.info.contrastText,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant={isSm ? "h5" : "h3"} fontWeight={700} gutterBottom>
                  <LocalCarWashIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: isSm ? 30 : 40 }} />
                  Service Management
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Manage your car wash services and associated chemicals.
                </Typography>
              </Box>
              <Button
                onClick={fetchData} // Refresh all data
                variant="contained"
                color="secondary"
                sx={{
                  borderRadius: 2.5,
                  fontWeight: 600,
                  minWidth: 120,
                  px: 3,
                  py: 1.5,
                  alignSelf: { xs: "flex-end", sm: "center" },
                  boxShadow: currentTheme.shadows[3],
                  "&:hover": {
                    boxShadow: currentTheme.shadows[6],
                    transform: "translateY(-2px)",
                  },
                }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh Data"}
              </Button>
            </Paper>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{
              display: "grid",
              gridTemplateColumns: isSm ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
              gap: currentTheme.spacing(3),
              marginBottom: currentTheme.spacing(4),
              justifyContent: "center",
            }}
          >
            <motion.div variants={statCardVariants} whileHover="hover">
              <Paper elevation={4} sx={{
                p: 3, display: "flex", alignItems: "center", gap: 2,
                borderLeft: `6px solid ${currentTheme.palette.primary.main}`, // Primary color border
                borderRadius: 3, bgcolor: "background.paper"
              }}>
                <Box sx={{ p: 1.5, bgcolor: currentTheme.palette.primary.light, borderRadius: '50%', color: currentTheme.palette.primary.dark, boxShadow: currentTheme.shadows[2] }}>
                  <LocalCarWashIcon sx={{ fontSize: 36 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Total Services</Typography>
                  <Typography variant="h5" fontWeight={700} color={currentTheme.palette.primary.dark}>{loading ? <CircularProgress size={24} /> : totalServices}</Typography>
                </Box>
              </Paper>
            </motion.div>
            <motion.div variants={statCardVariants} whileHover="hover">
              <Paper elevation={4} sx={{
                p: 3, display: "flex", alignItems: "center", gap: 2,
                borderLeft: `6px solid ${currentTheme.palette.success.main}`, // Success color border
                borderRadius: 3, bgcolor: "background.paper"
              }}>
                <Box sx={{ p: 1.5, bgcolor: currentTheme.palette.success.light, borderRadius: '50%', color: currentTheme.palette.success.dark, boxShadow: currentTheme.shadows[2] }}>
                  <ScienceIcon sx={{ fontSize: 36 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Total Chemicals</Typography>
                  <Typography variant="h5" fontWeight={700} color={currentTheme.palette.success.dark}>{loading ? <CircularProgress size={24} /> : totalChemicals}</Typography>
                </Box>
              </Paper>
            </motion.div>
          </motion.div>

          {/* Search and Add Service Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Paper
              elevation={4}
              sx={{
                p: { xs: 2, sm: 3 },
                mb: { xs: 2, sm: 3 },
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                borderRadius: 3,
                boxShadow: currentTheme.shadows[2],
                background: currentTheme.palette.background.paper
              }}
            >
              <TextField
                size="medium"
                placeholder="Search services..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { 
                    borderRadius: 2,
                    background: currentTheme.palette.background.default,
                  }
                }}
                sx={{
                  minWidth: { xs: "100%", sm: 250 },
                  flex: 1
                }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                sx={{
                  minWidth: { xs: "100%", sm: 180 },
                  fontWeight: 700,
                  borderRadius: 2.5,
                  height: 48,
                  bgcolor: currentTheme.palette.primary.main,
                  ":hover": { bgcolor: currentTheme.palette.primary.dark },
                  boxShadow: currentTheme.shadows[3],
                  "&:hover": {
                    boxShadow: currentTheme.shadows[6],
                    transform: "translateY(-2px)",
                  },
                }}
              >
                {isSm ? "Add Service" : "Add New Service"}
              </Button>
            </Paper>
          </motion.div>

          {/* Variety Tabs */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Tabs
              value={varietyTab}
              onChange={(_, v) => setVarietyTab(v)}
              sx={{
                mb: 3, // Increased margin bottom
                borderRadius: 2,
                background: currentTheme.palette.background.paper, // Use paper background
                boxShadow: currentTheme.shadows[1], // Subtle shadow
                minHeight: 48, // Slightly taller tabs
                '& .MuiTab-root': {
                  minHeight: 48,
                  fontWeight: 600,
                  color: currentTheme.palette.text.secondary, // Softer text color
                  '&.Mui-selected': {
                    color: currentTheme.palette.primary.main, // Primary color for selected tab
                    fontWeight: 700,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: currentTheme.palette.primary.main, // Primary color for indicator
                  height: 3, // Thicker indicator
                  borderRadius: '3px 3px 0 0', // Rounded top corners
                }
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              centered={!isSm} // Center tabs on larger screens
            >
              <Tab label="All Varieties" />
              {VARIETIES.map((v) => (
                <Tab key={v.key} label={v.label} />
              ))}
            </Tabs>
          </motion.div>

          {/* Services Table */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <TableContainer
              component={Paper}
              elevation={4} // Stronger shadow for the table
              sx={{
                borderRadius: 3,
                boxShadow: currentTheme.shadows[4], // Consistent shadow
                overflowX: "auto",
                maxWidth: "100%",
                minHeight: 200,
                border: "1px solid",
                borderColor: currentTheme.palette.divider,
                bgcolor: "background.paper",
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: currentTheme.shadows[6],
                }
              }}
            >
              {loading ? (
                <Box sx={{ p: 3 }}>
                  {[...Array(5)].map((_, index) => (
                    <Skeleton 
                      key={index} 
                      variant="rectangular" 
                      height={isSm ? 60 : 72} // Responsive height for skeleton rows
                      sx={{ 
                        mb: 1, 
                        borderRadius: 1,
                        bgcolor: currentTheme.palette.grey[200] // Lighter skeleton color
                      }} 
                    />
                  ))}
                </Box>
              ) : (
                <Table
                  size={isSm ? "small" : "medium"}
                  sx={{
                    minWidth: 700,
                    "& th, & td": {
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      maxWidth: isSm ? 90 : 180, // Responsive max width for cells
                    },
                    "& th": {
                      fontWeight: 700,
                      background: currentTheme.palette.grey[100], // Lighter header background
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      fontSize: '1rem', // Consistent font size
                      color: currentTheme.palette.text.primary,
                    },
                    "& tr": {
                      transition: "background 0.2s"
                    },
                    "& tr:hover": {
                      background: currentTheme.palette.action.hover // Use theme's hover color
                    }
                  }}
                  stickyHeader
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Service Name</TableCell>
                      <TableCell>Description</TableCell>
                      {VARIETIES.map(v => (
                        <TableCell key={v.key} align="center">
                          {v.label}
                          <Typography variant="caption" color="text.secondary" display="block">
                            {v.sub.join(", ")}
                          </Typography>
                        </TableCell>
                      ))}
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredServices.map(service => (
                      <TableRow
                        key={service.id}
                        hover
                        sx={{
                          '&:last-child td': { borderBottom: 0 }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, maxWidth: 160 }}>
                          <Typography noWrap title={service.name}>{service.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            title={service.description}
                          >
                            {service.description}
                          </Typography>
                        </TableCell>
                        {VARIETIES.map(v => (
                          <TableCell key={v.key} align="center">
                            <Typography fontWeight={500}>
                              {peso(service.prices?.[v.key] ?? 0)}
                            </Typography>
                          </TableCell>
                        ))}
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Edit Service">
                              <IconButton
                                color="primary"
                                onClick={() => handleEditService(service)}
                                size={isSm ? "small" : "medium"}
                                sx={{
                                  bgcolor: currentTheme.palette.primary.light,
                                  color: currentTheme.palette.primary.dark,
                                  boxShadow: currentTheme.shadows[1],
                                  transition: 'transform 0.2s',
                                  '&:hover': {
                                    backgroundColor: currentTheme.palette.primary.main,
                                    color: currentTheme.palette.common.white,
                                    transform: 'scale(1.1)',
                                    boxShadow: currentTheme.shadows[3],
                                  }
                                }}
                              >
                                <EditIcon fontSize={isSm ? "small" : "medium"} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Service">
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteService(service)}
                                size={isSm ? "small" : "medium"}
                                sx={{
                                  bgcolor: currentTheme.palette.error.light,
                                  color: currentTheme.palette.error.dark,
                                  boxShadow: currentTheme.shadows[1],
                                  transition: 'transform 0.2s',
                                  '&:hover': {
                                    backgroundColor: currentTheme.palette.error.main,
                                    color: currentTheme.palette.common.white,
                                    transform: 'scale(1.1)',
                                    boxShadow: currentTheme.shadows[3],
                                  }
                                }}
                              >
                                <DeleteIcon fontSize={isSm ? "small" : "medium"} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredServices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={VARIETIES.length + 3} align="center" sx={{ py: 6 }}>
                          <Box sx={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center",
                            gap: 1
                          }}>
                            <LocalCarWashIcon 
                              fontSize="large" 
                              color="disabled" 
                              sx={{ fontSize: 48, mb: 1 }} 
                            />
                            <Typography variant="h6" color="text.secondary">
                              No services found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {search.trim() || varietyTab !== 0 ? "Try a different search or filter." : "Click 'Add Service' to get started!"}
                            </Typography>
                            {(!search.trim() && varietyTab === 0) && (
                              <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => setAddDialogOpen(true)}
                                sx={{ mt: 2, borderRadius: 2, fontWeight: 600 }}
                              >
                                Add Service
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </motion.div>
        </Box>

        {/* Add Service Dialog */}
        <Dialog
          open={addDialogOpen}
          onClose={() => { setAddDialogOpen(false); setAddFormErrors({ name: false, description: false }); }} // Reset errors on close
          maxWidth="sm"
          fullWidth
          fullScreen={isSm}
          PaperProps={{
            sx: { borderRadius: isSm ? 0 : 3, boxShadow: currentTheme.shadows[8] }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700, 
            pb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: currentTheme.palette.primary.main,
            borderBottom: `1px solid ${currentTheme.palette.divider}`,
            mb: 2,
          }}>
            Add New Service
            <IconButton 
              onClick={() => { setAddDialogOpen(false); setAddFormErrors({ name: false, description: false }); }}
              sx={{ color: currentTheme.palette.text.secondary }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers={false} sx={{ py: 3 }}>
            <Stack spacing={3}>
              <TextField
                label="Service Name"
                fullWidth
                variant="outlined"
                value={newService.name}
                onChange={e => setNewService({ ...newService, name: e.target.value })}
                error={addFormErrors.name}
                helperText={addFormErrors.name ? "Service name is required" : ""}
                autoFocus
              />
              <TextField
                label="Description"
                fullWidth
                variant="outlined"
                multiline
                minRows={2}
                value={newService.description}
                onChange={e => setNewService({ ...newService, description: e.target.value })}
                error={false}
                helperText="Optional"
              />
              <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 600 }}>Prices by Vehicle Variety</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {VARIETIES.map(v => (
                  <TextField
                    key={v.key}
                    label={v.label}
                    type="number"
                    variant="outlined"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                      inputProps: { min: 0 }
                    }}
                    value={newService.prices[v.key] ?? 0}
                    onChange={e =>
                      setNewService({
                        ...newService,
                        prices: { ...newService.prices, [v.key]: Number(e.target.value) }
                      })
                    }
                    sx={{ flex: "1 1 120px", minWidth: 100 }}
                  />
                ))}
              </Box>
              {/* Chemicals Section */}
              <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 600 }}>Chemicals Used for this Service</Typography>
              <Autocomplete
                multiple
                options={chemicals}
                getOptionLabel={option => option.name}
                value={chemicals.filter(opt =>
                  newServiceChemicals.some(c => c.chemicalId === opt.id)
                )}
                onChange={(_, value) =>
                  setNewServiceChemicals(handleChemicalsChange(value, newServiceChemicals))
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => <TextField {...params} label="Select Chemicals" variant="outlined" />}
                filterSelectedOptions
              />
              {newServiceChemicals.map((chem, idx) => (
                <Box key={chem.chemicalId} sx={{ mb: 1, pl: 2, borderLeft: `3px solid ${currentTheme.palette.primary.light}`, py: 1 }}>
                  <Typography fontWeight={500} color="primary.dark">{chem.name}</Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    {VARIETIES.map(v => (
                      <TextField
                        key={v.key}
                        label={`${v.label} Usage (ml)`}
                        type="number"
                        variant="outlined"
                        size="small"
                        value={chem.usage?.[v.key] ?? ""}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewServiceChemicals(arr =>
                            arr.map((c, i) =>
                              i === idx
                                ? { ...c, usage: { ...c.usage, [v.key]: val } }
                                : c
                            )
                          );
                        }}
                        sx={{ width: 120 }} // Slightly wider for better label fit
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setAddDialogOpen(false); setAddFormErrors({ name: false, description: false }); }} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleAddService} sx={{ borderRadius: 2, fontWeight: 600 }} startIcon={<CheckIcon />}>
              Add Service
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setEditFormErrors({ name: false, description: false }); }} // Reset errors on close
          maxWidth="sm"
          fullWidth
          fullScreen={isSm}
          PaperProps={{
            sx: { borderRadius: isSm ? 0 : 3, boxShadow: currentTheme.shadows[8] }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700, 
            pb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: currentTheme.palette.primary.main,
            borderBottom: `1px solid ${currentTheme.palette.divider}`,
            mb: 2,
          }}>
            Edit Service
            <IconButton 
              onClick={() => { setEditDialogOpen(false); setEditFormErrors({ name: false, description: false }); }}
              sx={{ color: currentTheme.palette.text.secondary }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers={false} sx={{ pt: 3 }}>
            <Stack spacing={3}>
              <TextField
                label="Service Name"
                fullWidth
                variant="outlined"
                value={selectedService?.name || ""}
                onChange={e =>
                  setSelectedService(selectedService
                    ? { ...selectedService, name: e.target.value }
                    : null
                  )
                }
                error={editFormErrors.name}
                helperText={editFormErrors.name ? "Service name is required" : ""}
              />
              <TextField
                label="Description"
                fullWidth
                variant="outlined"
                multiline
                minRows={2}
                value={selectedService?.description || ""}
                onChange={e =>
                  setSelectedService(selectedService
                    ? { ...selectedService, description: e.target.value }
                    : null
                  )
                }
                error={false}
                helperText="Optional"
              />
              <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 600 }}>Prices by Vehicle Variety</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {VARIETIES.map(v => (
                  <TextField
                    key={v.key}
                    label={v.label}
                    type="number"
                    variant="outlined"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                      inputProps: { min: 0 }
                    }}
                    value={selectedService?.prices?.[v.key] ?? 0}
                    onChange={e =>
                      setSelectedService(selectedService
                        ? {
                            ...selectedService,
                            prices: { ...selectedService.prices, [v.key]: Number(e.target.value) }
                          }
                        : null
                      )
                    }
                    sx={{ flex: "1 1 120px", minWidth: 100 }}
                  />
                ))}
              </Box>
              {/* Chemicals Section */}
              <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 600 }}>Chemicals Used for this Service</Typography>
              <Autocomplete
                multiple
                options={chemicals}
                getOptionLabel={option => option.name}
                value={chemicals.filter(opt =>
                  editServiceChemicals.some(c => c.chemicalId === opt.id)
                )}
                onChange={(_, value) =>
                  setEditServiceChemicals(handleChemicalsChange(value, editServiceChemicals))
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => <TextField {...params} label="Select Chemicals" variant="outlined" />}
                filterSelectedOptions
              />
              {editServiceChemicals.map((chem, idx) => (
                <Box key={chem.chemicalId} sx={{ mb: 1, pl: 2, borderLeft: `3px solid ${currentTheme.palette.primary.light}`, py: 1 }}>
                  <Typography fontWeight={500} color="primary.dark">{chem.name}</Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    {VARIETIES.map(v => (
                      <TextField
                        key={v.key}
                        label={`${v.label} Usage (ml)`}
                        type="number"
                        variant="outlined"
                        size="small"
                        value={chem.usage?.[v.key] ?? ""}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setEditServiceChemicals(arr =>
                            arr.map((c, i) =>
                              i === idx
                                ? { ...c, usage: { ...c.usage, [v.key]: val } }
                                : c
                            )
                          );
                        }}
                        sx={{ width: 120 }}
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setEditDialogOpen(false); setEditFormErrors({ name: false, description: false }); }} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleUpdateService} sx={{ borderRadius: 2, fontWeight: 600 }} startIcon={<CheckIcon />}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Service Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          fullScreen={isSm}
          PaperProps={{
            sx: { borderRadius: isSm ? 0 : 3, boxShadow: currentTheme.shadows[8] }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700, 
            pb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: currentTheme.palette.error.main,
            borderBottom: `1px solid ${currentTheme.palette.divider}`,
            mb: 2,
          }}>
            Confirm Deletion
            <IconButton 
              onClick={() => setDeleteDialogOpen(false)}
              sx={{ color: currentTheme.palette.text.secondary }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 1 }}>
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              textAlign: "center",
              gap: 2
            }}>
              <DeleteIcon sx={{ fontSize: 64, color: currentTheme.palette.error.main, mb: 1 }} />
              <Typography variant="h6" fontWeight={600} color={currentTheme.palette.text.primary}>
                Delete service "{selectedService?.name}"?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This action cannot be undone. All associated data will be permanently removed.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button color="error" variant="contained" onClick={confirmDeleteService} sx={{ borderRadius: 2, fontWeight: 600 }} startIcon={<DeleteIcon />}>
              Delete Permanently
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert 
            severity={snackbar.severity} 
            sx={{ width: "100%", borderRadius: 2, boxShadow: currentTheme.shadows[3] }}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </AppSidebar>
    </ThemeProvider>
  );
};

export default ServiceManagementPage;
