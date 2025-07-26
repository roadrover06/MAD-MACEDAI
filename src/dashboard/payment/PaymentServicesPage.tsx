import React, { useEffect, useState, useMemo } from "react";
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
  Select,
  MenuItem,
  InputAdornment,
  Chip,
  OutlinedInput,
  Divider,
  useMediaQuery,
  LinearProgress
} from "@mui/material";
import AppSidebar from "../AppSidebar";
import { collection, getDocs, addDoc, updateDoc, doc as firestoreDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useTheme } from "@mui/material/styles";
import Autocomplete from "@mui/material/Autocomplete";
import PaymentIcon from "@mui/icons-material/PointOfSale";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import PaidIcon from "@mui/icons-material/Paid";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GroupIcon from "@mui/icons-material/Group";
import ScienceIcon from "@mui/icons-material/Science";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { format } from "date-fns";
import { Firestore } from "firebase/firestore";
import { setLocal, queueSync, getAllLocal, deleteLocal, onSyncStatus } from "../../utils/offlineSync";
import { isOnline } from "../../firebase/firebase";
import Pagination from "@mui/material/Pagination";

const getDocRef = (db: Firestore, collection: string, id: string) => {
  return firestoreDoc(db, collection, id);
};
  const VARIETIES = [
  { key: "motor", label: "Motor" },
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
  { key: "xlarge", label: "X-Large" }
];

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "gcash", label: "GCash" },
  { key: "card", label: "Card" },
  { key: "maya", label: "Maya" }
];

// Update Service interface to include chemicals
interface Service {
  id: string;
  name: string;
  description: string;
  prices: { [variety: string]: number };
  chemicals?: {
    [chemicalId: string]: {
      name: string;
      usage: { [variety: string]: number };
    }
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface PaymentRecord {
  id?: string;
  customerName: string;
  carName: string;
  plateNumber: string;
  variety: string;
  serviceId: string;
  serviceName: string;
  price: number;
  cashier: string;
  cashierFullName?: string; // new
  employees: { id: string; name: string; commission: number }[];
  referrer?: { id: string; name: string; commission: number };
  createdAt: number;
  paid?: boolean; // new
  paymentMethod?: string; // add payment method
  amountTendered?: number; // add this
  change?: number;         // add this
  voided?: boolean;
  serviceIds?: string[]; // new: for multi-service
  serviceNames?: string[]; // new: for multi-service
  manualServices?: { name: string; price: number }[]; // <-- add this
}

interface PaymentServicesPageProps {
  onLogout?: () => void;
  onProfile?: () => void;
  firstName?: string;
  lastName?: string;
  cashierUsername: string;
}

const peso = (v: number | undefined | null) =>
  typeof v === "number" && !isNaN(v)
    ? `₱${v.toLocaleString()}`
    : "₱0";

interface LoyaltyCustomer {
  id?: string;
  name: string;
  cars: { carName: string; plateNumber: string }[];
}

const PaymentServicesPage: React.FC<PaymentServicesPageProps> = ({
  onLogout,
  onProfile,
  firstName,
  lastName,
  cashierUsername
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const [form, setForm] = useState({
    customerName: "",
    carName: "",
    plateNumber: "",
    variety: VARIETIES[0].key,
    serviceIds: [] as string[], // new
    price: 0,
    employees: [] as { id: string; name: string; commission: number }[],
    commissions: {} as { [id: string]: number },
    referrerId: "",
    referrerCommission: 0,
    paymentMethod: PAYMENT_METHODS[0].key // default to cash
  });
  const [amountTendered, setAmountTendered] = useState<number | "">("");
  const [change, setChange] = useState<number>(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Quick amount buttons for payment dialog
  const quickAmounts = useMemo(() => {
    // Suggest common amounts: exact price, price + 20, price + 50, price + 100, price + 500
    if (typeof form.price === "number" && form.price > 0) {
      return [
        form.price,
        form.price + 20,
        form.price + 50,
        form.price + 100,
        form.price + 500
      ];
    }
    return [100, 200, 500, 1000];
  }, [form.price]);
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [payLater, setPayLater] = useState(false);
  const [payingRecordId, setPayingRecordId] = useState<string | null>(null); // for "Pay Now" on unpaid
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<LoyaltyCustomer[]>([]);
  const [customerMode, setCustomerMode] = useState<"registered" | "manual">("manual");
  const [selectedLoyaltyCustomer, setSelectedLoyaltyCustomer] = useState<LoyaltyCustomer | null>(null);
  const [selectedLoyaltyCar, setSelectedLoyaltyCar] = useState<{ carName: string; plateNumber: string } | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Search/filter state
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "paid" | "unpaid">("");

  // Add filter states
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchServices();
    fetchEmployees();
    fetchRecords();
    fetchLoyaltyCustomers();
  }, []);

  const fetchServices = async () => {
    const snapshot = await getDocs(collection(db, "services"));
    setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[]);
  };

  const fetchEmployees = async () => {
    const snapshot = await getDocs(collection(db, "employees"));
    setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
  };

  // --- MODIFIED: Fetch records from Firestore AND local offline DB ---
  const fetchRecords = async () => {
    // Firestore
    const snapshot = await getDocs(collection(db, "payments"));
    const firestoreRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentRecord[];
    // Local offline
    let localRecords: PaymentRecord[] = [];
    try {
      localRecords = await getAllLocal("payments") as PaymentRecord[] || [];
    } catch {}
    // Merge: if local record matches Firestore, skip local
    const mergedRecords: PaymentRecord[] = [...firestoreRecords];
    for (const local of localRecords) {
      const match = firestoreRecords.find(f =>
        f.customerName === local.customerName &&
        f.carName === local.carName &&
        f.plateNumber === local.plateNumber &&
        f.createdAt === local.createdAt &&
        f.price === local.price
      );
      if (!match) {
        mergedRecords.push(local);
      } else {
        // Already synced, remove local copy
        if (local.id) await deleteLocal("payments", local.id);
      }
    }
    mergedRecords.sort((a, b) => b.createdAt - a.createdAt);
    setRecords(mergedRecords);
  };

  const fetchLoyaltyCustomers = async () => {
    const snapshot = await getDocs(collection(db, "loyalty_customers"));
    setLoyaltyCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoyaltyCustomer[]);
  };

  // Multi-service price calculation (now includes manual services)
  const calcTotalPrice = (serviceIds: string[], variety: string, manualSvcs: { name: string; price: number }[]) => {
    const autoTotal = serviceIds.reduce((sum, id) => {
      const s = services.find(s => s.id === id);
      return sum + (s?.prices?.[variety] ?? 0);
    }, 0);
    const manualTotal = manualSvcs.reduce((sum, s) => sum + (typeof s.price === "number" ? s.price : 0), 0);
    return autoTotal + manualTotal;
  };

  const handleServiceChange = (serviceId: string, variety: string) => {
    const service = services.find(s => s.id === serviceId);
    const price = service ? (service.prices?.[variety] ?? 0) : 0;
    setForm(f => ({ ...f, serviceId, price }));
  };

  // Handle service selection (multi-select)
  const handleServicesChange = (event: any) => {
    const value = event.target.value as string[];
    setForm(f => {
      const price = calcTotalPrice(value, f.variety, manualServices);
      return { ...f, serviceIds: value, price };
    });
  };

  // When variety changes, recalculate price for all selected services
  const handleVarietyChange = (variety: string) => {
    setForm(f => {
      const price = calcTotalPrice(f.serviceIds, variety, manualServices);
      return { ...f, variety, price };
    });
  };

  // Manual service entry state
  const [manualServiceName, setManualServiceName] = useState("");
  const [manualServicePrice, setManualServicePrice] = useState<number | "">("");
  const [manualServices, setManualServices] = useState<{ name: string; price: number }[]>([]);

  // Add manual service to the list
  const handleAddManualService = () => {
    if (
      manualServiceName.trim() &&
      typeof manualServicePrice === "number" &&
      manualServicePrice >= 0 // allow zero price
    ) {
      setManualServices(prev => [...prev, { name: manualServiceName.trim(), price: manualServicePrice }]);
      setManualServiceName("");
      setManualServicePrice("");
      setForm(f => ({
        ...f,
        price: calcTotalPrice(f.serviceIds, f.variety, [...manualServices, { name: manualServiceName.trim(), price: manualServicePrice }])
      }));
    }
  };

  // Remove manual service from the list
  const handleRemoveManualService = (idx: number) => {
    setManualServices(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setForm(f => ({
        ...f,
        price: calcTotalPrice(f.serviceIds, f.variety, next)
      }));
      return next;
    });
  };

  // Handle employee selection (multi-select)
  const handleEmployeesChange = (event: any) => {
    const value = event.target.value as string[];
    setForm(f => ({
      ...f,
      employees: value.map(id => {
        const existing = f.employees.find(e => e.id === id);
        const emp = employees.find(e => e.id === id);
        return {
          id,
          name: emp ? `${emp.firstName} ${emp.lastName}` : "",
          commission: existing ? existing.commission : 0
        };
      }),
      commissions: value.reduce((acc, id) => {
        acc[id] = f.commissions[id] ?? 0;
        return acc;
      }, {} as { [id: string]: number })
    }));
  };

  // Handle commission input for each employee (percentage)
  const handleCommissionChange = (id: string, percent: number) => {
    setForm(f => ({
      ...f,
      commissions: { ...f.commissions, [id]: percent },
      employees: f.employees.map(e =>
        e.id === id
          ? { ...e, commission: Math.round((percent / 100) * f.price) }
          : e
      )
    }));
  };

  // Add referrer commission calculation
  const handleReferrerChange = (id: string) => {
    setForm(f => ({
      ...f,
      referrerId: id,
      referrerCommission: f.referrerCommission // keep commission value
    }));
  };
  const handleReferrerCommissionChange = (commission: number) => {
    setForm(f => ({
      ...f,
      referrerCommission: commission
    }));
  };

  // When price changes, update commission values
  useEffect(() => {
    setForm(f => ({
      ...f,
      employees: f.employees.map(e => ({
        ...e,
        commission: Math.round(((f.commissions[e.id] ?? 0) / 100) * f.price)
      }))
    }));
    // eslint-disable-next-line
  }, [form.price]);

  // Update change when amountTendered or form.price changes
  useEffect(() => {
    if (typeof amountTendered === "number" && !isNaN(amountTendered)) {
      setChange(amountTendered - form.price);
    } else {
      setChange(0);
    }
  }, [amountTendered, form.price]);

  // Fix: Only open processDialog, do not save payment yet
  const handleProcessPayment = () => {
    setProcessDialogOpen(true);
    setAmountTendered(form.price);
    setPayLater(false);
    setPayingRecordId(null);
  };

  // Helper to add points to loyalty customer if matched
  const addLoyaltyPoints = async (customerName: string, plateNumber: string, pointsToAdd: number) => {
    if (!customerName || !plateNumber) return;
    // Find loyalty customer with matching name and car plate
    const matched = loyaltyCustomers.find(c =>
      c.name.trim().toLowerCase() === customerName.trim().toLowerCase() &&
      c.cars.some(car => car.plateNumber.trim().toLowerCase() === plateNumber.trim().toLowerCase())
    );
    if (matched && matched.id) {
      const { updateDoc, doc: firestoreDoc, increment } = await import("firebase/firestore");
      await updateDoc(firestoreDoc(db, "loyalty_customers", matched.id), {
        points: increment(pointsToAdd)
      });
    }
  };

  // Add: Decrease chemical stock when service is availed and paid
  const decreaseChemicalsStock = async (serviceId: string, variety: string) => {
    // Find the service and its chemicals usage
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.chemicals) return;
    const chemicals = service.chemicals;
    // For each chemical, decrease its stock by the usage for the selected variety
    for (const [chemicalId, chem] of Object.entries(chemicals)) {
      // Fix: chem is unknown, so cast to expected type
      const usage = (chem as { usage?: { [variety: string]: number } }).usage?.[variety];
      if (usage && usage > 0) {
        try {
          const chemDocRef = getDocRef(db, "chemicals", chemicalId);
          // Use Firestore increment to decrease stock atomically
          // Modular SDK: import increment dynamically
          const { increment } = await import("firebase/firestore");
          await updateDoc(chemDocRef, { stock: increment(-usage) });
        } catch (err) {
          // Ignore error, but you may want to show a warning
        }
      }
    }
  };

  // Save payment only on confirm (for new or for "Pay Now")
  const handleAddPayment = async () => {
    try {
      // Defensive: Ensure customerName, carName, plateNumber are strings (not undefined/null)
      const customerName = typeof form.customerName === "string" ? form.customerName : "";
      const carName = typeof form.carName === "string" ? form.carName : "";
      const plateNumber = typeof form.plateNumber === "string" ? form.plateNumber : "";

      if (!customerName.trim() || !carName.trim() || !plateNumber.trim()) {
        setSnackbar({ open: true, message: "Please fill in all customer and car details.", severity: "error" });
        return;
      }

      // Always use an array for employees, even if empty
      const employees: { id: string; name: string; commission: number }[] =
        Array.isArray(form.employees)
          ? form.employees.filter(e => e && typeof e.id === "string" && e.id.trim() !== "")
          : [];

      // Defensive: If no referrer, do not include referrer field at all
      let referrerObj: PaymentRecord["referrer"] = undefined;
      if (form.referrerId && form.referrerId !== "") {
        let refEmpFullName = "";
        const empObj = employees.find(e => e.id === form.referrerId);
        if (empObj && typeof empObj.name === "string") {
          refEmpFullName = empObj.name;
        } else {
          const emp = employees.length === 0 && Array.isArray(employees)
            ? undefined
            : employees.find(e => e.id === form.referrerId);
          if (emp && typeof emp.name === "string") {
            refEmpFullName = emp.name;
          }
        }
        referrerObj = {
          id: form.referrerId,
          name: refEmpFullName,
          commission: Math.round((form.referrerCommission / 100) * totalPrice)
        };
      }

      // Get service names for all selected services
      const selectedServices = form.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
      const manualServiceDisplayNames = manualServices.map(s => `${s.name} (${peso(s.price)})`);
      const serviceNames = [
        ...selectedServices.map(s => s.name),
        ...manualServiceDisplayNames
      ];

      // --- FIX: Always use effective cashier info ---
      const record: PaymentRecord = {
        customerName,
        carName,
        plateNumber,
        variety: form.variety,
        serviceIds: form.serviceIds,
        serviceNames: serviceNames,
        serviceId: form.serviceIds[0] || "",
        serviceName: serviceNames.join(", "),
        price: totalPrice,
        cashier: effectiveCashierUsername,
        cashierFullName: [effectiveFirstName, effectiveLastName].filter(Boolean).join(" "),
        employees,
        ...(referrerObj ? { referrer: referrerObj } : {}),
        createdAt: Date.now(),
        paid: !payLater,
        ...(payLater ? {} : { 
          paymentMethod: form.paymentMethod,
          amountTendered: typeof amountTendered === "number" ? amountTendered : undefined,
          change: typeof amountTendered === "number" ? amountTendered - totalPrice : undefined
        }),
        ...(manualServices.length > 0 ? { manualServices } : {})
      };

      if (payingRecordId) {
        if (isOnline()) {
          // ...existing online update...
          const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
          await updateDoc(firestoreDoc(db, "payments", payingRecordId), {
            paid: true,
            paymentMethod: form.paymentMethod,
            amountTendered: typeof amountTendered === "number" ? amountTendered : undefined,
            change: typeof amountTendered === "number" ? amountTendered - totalPrice : undefined,
            createdAt: Date.now()
          });
          for (const sid of form.serviceIds) {
            await decreaseChemicalsStock(sid, form.variety);
          }
          await addLoyaltyPoints(customerName, plateNumber, 0.25);
          setSnackbar({ open: true, message: "Payment completed!", severity: "success" });
        } else {
          // --- OFFLINE: update local record and queue for sync ---
          // Find the local record
          let localRecord: PaymentRecord | undefined;
          try {
            const localRecords = await getAllLocal("payments") as PaymentRecord[] || [];
            localRecord = localRecords.find(r => r.id === payingRecordId);
          } catch {}
          // If found, update fields
          if (localRecord) {
            const updated: PaymentRecord = {
              ...localRecord,
              paid: true,
              paymentMethod: form.paymentMethod,
              amountTendered: typeof amountTendered === "number" ? amountTendered : undefined,
              change: typeof amountTendered === "number" ? amountTendered - totalPrice : undefined,
              createdAt: Date.now()
            };
            await setLocal("payments", updated);
            await queueSync("update", "payments", updated);
            setSnackbar({ open: true, message: "Payment completed! (offline, will sync)", severity: "success" });
          } else {
            // fallback: just update by id
            await setLocal("payments", {
              id: payingRecordId,
              paid: true,
              paymentMethod: form.paymentMethod,
              amountTendered: typeof amountTendered === "number" ? amountTendered : undefined,
              change: typeof amountTendered === "number" ? amountTendered - totalPrice : undefined,
              createdAt: Date.now()
            });
            await queueSync("update", "payments", {
              id: payingRecordId,
              paid: true,
              paymentMethod: form.paymentMethod,
              amountTendered: typeof amountTendered === "number" ? amountTendered : undefined,
              change: typeof amountTendered === "number" ? amountTendered - totalPrice : undefined,
              createdAt: Date.now()
            });
            setSnackbar({ open: true, message: "Payment completed! (offline, will sync)", severity: "success" });
          }
        }
      } else {
        // ...existing code for new payment...
        if (isOnline()) {
          await addDoc(collection(db, "payments"), record);
          if (!payLater) {
            for (const sid of form.serviceIds) {
              await decreaseChemicalsStock(sid, form.variety);
            }
            await addLoyaltyPoints(customerName, plateNumber, 0.25);
          }
          setSnackbar({ open: true, message: payLater ? "Service recorded as unpaid." : "Payment recorded!", severity: "success" });
        } else {
          // Offline: save to local DB and queue for sync
          const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await setLocal("payments", { ...record, id: newId });
          await queueSync("add", "payments", { ...record, id: newId });
          setSnackbar({ open: true, message: "Added offline. Will sync when online.", severity: "success" });
        }
      }
      setAddDialogOpen(false);
      setProcessDialogOpen(false);
      setPayLater(false);
      setPayingRecordId(null);
      setForm({
        customerName: "",
        carName: "",
        plateNumber: "",
        variety: VARIETIES[0].key,
        serviceIds: [],
        price: 0,
        employees: [],
        commissions: {},
        referrerId: "",
        referrerCommission: 0,
        paymentMethod: PAYMENT_METHODS[0].key
      });
      setAmountTendered("");
      setChange(0);
      setManualServices([]);
      fetchRecords();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to record payment", severity: "error" });
    }
  };

  // --- FIX: Void logic for offline records ---
  async function handleVoidRecord(selectedRecord: PaymentRecord): Promise<void> {
    if (!selectedRecord.id) {
      setSnackbar({ open: true, message: "Cannot void: record has no ID.", severity: "error" });
      return;
    }
    try {
      let firestoreExists = false;
      try {
        const { getDoc, doc: firestoreDoc } = await import("firebase/firestore");
        const docSnap = await getDoc(firestoreDoc(db, "payments", selectedRecord.id));
        firestoreExists = docSnap.exists();
      } catch {}
      if (firestoreExists) {
        await updateDoc(firestoreDoc(db, "payments", selectedRecord.id), {
          voided: true,
          paid: false,
        });
        await deleteLocal("payments", selectedRecord.id);
      } else {
        // Offline record: update locally and queue for sync
        await setLocal("payments", { ...selectedRecord, voided: true, paid: false });
        await queueSync("update", "payments", { ...selectedRecord, voided: true, paid: false });
      }
      setSnackbar({ open: true, message: "Transaction voided successfully.", severity: "success" });
      setDetailsDialogOpen(false);
      fetchRecords();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to void transaction.", severity: "error" });
    }
  }

  async function handleDeleteRecord(selectedRecord: PaymentRecord): Promise<void> {
    if (!selectedRecord.id) {
      setSnackbar({ open: true, message: "Cannot delete: record has no ID.", severity: "error" });
      return;
    }
    try {
      let firestoreExists = false;
      try {
        const { getDoc, doc: firestoreDoc } = await import("firebase/firestore");
        const docSnap = await getDoc(firestoreDoc(db, "payments", selectedRecord.id));
        firestoreExists = docSnap.exists();
      } catch {}
      if (firestoreExists) {
        await deleteDoc(firestoreDoc(db, "payments", selectedRecord.id));
        await deleteLocal("payments", selectedRecord.id);
      } else {
        // Offline record: delete locally and queue for sync
        await deleteLocal("payments", selectedRecord.id);
        await queueSync("delete", "payments", { id: selectedRecord.id });
      }
      setSnackbar({ open: true, message: "Transaction deleted.", severity: "success" });
      setDetailsDialogOpen(false);
      fetchRecords();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete transaction.", severity: "error" });
    }
  }

  // TODO: Replace with actual role logic if needed (e.g., from props or context)
  const role = (localStorage.getItem("role") || "cashier"); // ADD THIS LINE

  // --- NEW: Get cashier info from localStorage if not provided via props ---
  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "{}");
    } catch {
      return {};
    }
  }, []);
  const effectiveCashierUsername = cashierUsername || userInfo.username || "";
  const effectiveFirstName = firstName || userInfo.firstName || "";
  const effectiveLastName = lastName || userInfo.lastName || "";

  // --- Optimize service list for UI/UX ---
  const serviceOptions = useMemo(
    () =>
      services.filter(
        s => typeof s.prices[form.variety] === "number" && s.prices[form.variety] > 0
      ),
    [services, form.variety]
  );

  // --- Optimize price calculation ---
  const totalPrice = useMemo(
    () => calcTotalPrice(form.serviceIds, form.variety, manualServices),
    [form.serviceIds, form.variety, manualServices]
  );

  // Derived stats and filtered data
  const totalPayments = records.length;
  const totalSales = records.reduce((sum, r) => r.voided ? sum : sum + (r.price || 0), 0);
  const totalPaid = records.filter(r => r.paid && !r.voided).length;
  const totalUnpaid = records.filter(r => !r.paid && !r.voided).length;

  // Most availed services
  const serviceCountMap: { [name: string]: number } = {};
  records.forEach(r => {
    if (Array.isArray(r.serviceNames)) {
      r.serviceNames.forEach(name => {
        if (!serviceCountMap[name]) serviceCountMap[name] = 0;
        serviceCountMap[name]++;
      });
    } else if (r.serviceName) {
      if (!serviceCountMap[r.serviceName]) serviceCountMap[r.serviceName] = 0;
      serviceCountMap[r.serviceName]++;
    }
  });
  const mostAvailed = Object.entries(serviceCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Unique customers/services for filter dropdowns
  const uniqueCustomers = Array.from(new Set(records.map(r => r.customerName).filter(Boolean)));
  const uniqueServices = Array.from(new Set(
    records.flatMap(r => Array.isArray(r.serviceNames) ? r.serviceNames : [r.serviceName]).filter(Boolean)
  ));

  // Filtered records for table
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (dateFrom && r.createdAt < new Date(dateFrom).getTime()) return false;
      if (dateTo && r.createdAt > new Date(dateTo).getTime() + 24 * 60 * 60 * 1000) return false;
      if (customerFilter && r.customerName !== customerFilter) return false;
      if (serviceFilter) {
        const names = Array.isArray(r.serviceNames) ? r.serviceNames : [r.serviceName];
        if (!names.includes(serviceFilter)) return false;
      }
      if (searchCustomer && !r.customerName.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
      if (searchPlate && !r.plateNumber.toLowerCase().includes(searchPlate.toLowerCase())) return false;
      if (statusFilter === "paid" && (!r.paid || r.voided)) return false;
      if (statusFilter === "unpaid" && (r.paid || r.voided)) return false;
      return true;
    });
  }, [records, dateFrom, dateTo, customerFilter, serviceFilter, searchCustomer, searchPlate, statusFilter]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  // Reset to first page when filters change or records change
  useEffect(() => {
    setPage(0);
  }, [filteredRecords.length, dateFrom, dateTo, customerFilter, serviceFilter, searchCustomer, searchPlate, statusFilter]);

  // Row click handler for details dialog or process payment for unpaid
  const handleRowClick = (r: PaymentRecord) => {
    // If record is unpaid and not voided, open process payment dialog directly
    if (!r.paid && !r.voided) {
      // Set form fields based on the record
      setForm(f => ({
        ...f,
        customerName: r.customerName,
        carName: r.carName,
        plateNumber: r.plateNumber,
        variety: r.variety,
        serviceIds: Array.isArray(r.serviceIds) ? r.serviceIds : r.serviceId ? [r.serviceId] : [],
        price: r.price,
        employees: Array.isArray(r.employees) ? r.employees : [],
        commissions: Array.isArray(r.employees)
          ? Object.fromEntries(r.employees.map(e => [e.id, e.commission && r.price ? Math.round((e.commission / r.price) * 100) : 0]))
          : {},
        referrerId: r.referrer?.id || "",
        referrerCommission: r.referrer
          ? r.referrer.commission && r.price
            ? Math.round((r.referrer.commission / r.price) * 100)
            : 0
          : 0,
        paymentMethod: r.paymentMethod || PAYMENT_METHODS[0].key
      }));
      setManualServices(Array.isArray(r.manualServices) ? r.manualServices : []);
      setAmountTendered(r.price);
      setChange(0);
      setPayLater(false);
      setPayingRecordId(r.id || null);
      setProcessDialogOpen(true);
      setSelectedRecord(r); // Optionally keep for reference
    } else {
      setSelectedRecord(r);
      setDetailsDialogOpen(true);
    }
  };

  // Add this effect after the state declarations (after selectedLoyaltyCustomer, selectedLoyaltyCar, customerMode)
  useEffect(() => {
    if (
      customerMode === "registered" &&
      selectedLoyaltyCustomer &&
      selectedLoyaltyCar
    ) {
      setForm(f => ({
        ...f,
        customerName: selectedLoyaltyCustomer.name,
        carName: selectedLoyaltyCar.carName,
        plateNumber: selectedLoyaltyCar.plateNumber
      }));
    }
  }, [customerMode, selectedLoyaltyCustomer, selectedLoyaltyCar]);

  useEffect(() => {
    // Listen for offline sync events
    const handler = (status: "start" | "end") => setSyncingOffline(status === "start");
    onSyncStatus(handler);
    return () => {
      // No need to remove handler for this simple case
    };
  }, []);

  return (
    <AppSidebar
      role={role as "cashier" | "admin"}
      firstName={firstName}
      lastName={lastName}
      onLogout={onLogout}
      onProfile={onProfile}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 2, px: { xs: 1, sm: 2 }, pb: 6 }}>
        {/* Show syncing offline data message */}
        {syncingOffline && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress color="info" />
            <Typography color="info.main" sx={{ mt: 1, fontWeight: 600 }}>
              Syncing offline data to Firebase...
            </Typography>
          </Box>
        )}
        {/* Stats Section */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Paper elevation={3} sx={{
            flex: 1, minWidth: 180, p: 2, display: "flex", alignItems: "center", gap: 2,
            borderLeft: "5px solid #1976d2", bgcolor: "background.paper"
          }}>
            <PaymentIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Total Transactions</Typography>
              <Typography variant="h6" fontWeight={700}>{totalPayments}</Typography>
            </Box>
          </Paper>
          <Paper elevation={3} sx={{
            flex: 1, minWidth: 180, p: 2, display: "flex", alignItems: "center", gap: 2,
            borderLeft: "5px solid #43a047", bgcolor: "background.paper"
          }}>
            <PaidIcon color="success" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Total Sales</Typography>
              <Typography variant="h6" fontWeight={700}>{peso(totalSales)}</Typography>
            </Box>
          </Paper>
          <Paper elevation={3} sx={{
            flex: 1, minWidth: 180, p: 2, display: "flex", alignItems: "center", gap: 2,
            borderLeft: "5px solid #1976d2", bgcolor: "background.paper"
          }}>
            <AttachMoneyIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Paid</Typography>
              <Typography variant="h6" fontWeight={700}>{totalPaid}</Typography>
            </Box>
          </Paper>
          <Paper elevation={3} sx={{
            flex: 1, minWidth: 180, p: 2, display: "flex", alignItems: "center", gap: 2,
            borderLeft: "5px solid #fbc02d", bgcolor: "background.paper"
          }}>
            <MoneyOffIcon color="warning" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Unpaid</Typography>
              <Typography variant="h6" fontWeight={700}>{totalUnpaid}</Typography>
            </Box>
          </Paper>
        </Box>
        {/* Header Section */}
        <Paper sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          borderRadius: 3,
          boxShadow: 3,
          background: "linear-gradient(90deg, #f8fafc 60%, #e3f2fd 100%)"
        }}>
          <Box>
            <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700}>
              Payment & Services
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and process all service payments
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => setAddDialogOpen(true)}
            sx={{
              minWidth: 140,
              borderRadius: 2,
              fontWeight: 600,
              bgcolor: "primary.main",
              ":hover": { bgcolor: "primary.dark" }
            }}
          >
            New Service
          </Button>
        </Paper>
        {/* Most Availed Services */}
        <Paper elevation={2} sx={{ mb: 3, borderRadius: 3, p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            <EmojiEventsIcon color="warning" sx={{ mr: 1, verticalAlign: "middle" }} />
            Most Availed Services
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {mostAvailed.length === 0 ? (
            <Typography color="text.secondary">No services availed yet.</Typography>
          ) : (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {mostAvailed.map(([service, count], idx) => (
                <Chip
                  key={service}
                  label={`${service} (${count})`}
                  color={idx === 0 ? "warning" : idx === 1 ? "info" : "default"}
                  icon={<EmojiEventsIcon />}
                  sx={{ fontWeight: 600, fontSize: 16, px: 2, py: 1 }}
                />
              ))}
            </Box>
          )}
        </Paper>
        {/* Search and Filter Controls */}
        <Paper sx={{
          p: { xs: 2, sm: 2 },
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          <FilterAltIcon color="primary" sx={{ mr: 1 }} />
          <TextField
            label="From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <Select
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            size="small"
            displayEmpty
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Customers</MenuItem>
            {uniqueCustomers.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
          <Select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            size="small"
            displayEmpty
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Services</MenuItem>
            {uniqueServices.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
          <TextField
            label="Search Customer"
            value={searchCustomer}
            onChange={e => setSearchCustomer(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "action.active" }} />
            }}
          />
          <TextField
            label="Search Plate #"
            value={searchPlate}
            onChange={e => setSearchPlate(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as "" | "paid" | "unpaid")}
            size="small"
            displayEmpty
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
          </Select>
          <Button
            variant="outlined"
            color="primary"
            onClick={fetchRecords}
            sx={{ ml: "auto", borderRadius: 2, minWidth: 44, px: 2, py: 1 }}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Paper>
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell>Car Name</TableCell>
                <TableCell>Plate #</TableCell>
                <TableCell>Variety</TableCell>
                <TableCell>Service(s)</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Cashier</TableCell>
                <TableCell>Employees</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Payment Method</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRecords.map(r => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    transition: "background 0.2s",
                    "&:hover": { background: theme.palette.action.hover }
                  }}
                  onClick={() => handleRowClick(r)}
                >
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell>{r.carName}</TableCell>
                  <TableCell>{r.plateNumber || "-"}</TableCell>
                  <TableCell>{VARIETIES.find(v => v.key === r.variety)?.label || r.variety}</TableCell>
                  <TableCell>
                    {Array.isArray(r.serviceNames) && r.serviceNames.length > 0
                      ? r.serviceNames.join(", ")
                      : r.serviceName}
                  </TableCell>
                  <TableCell>{peso(r.price)}</TableCell>
                  <TableCell>
                    {r.cashierFullName
                      ? r.cashierFullName
                      : r.cashier}
                  </TableCell>
                  {/* Employees column: move stopPropagation to Chip */}
                  <TableCell>
                    {Array.isArray(r.employees) && r.employees.length > 0
                      ? r.employees.map(e => (
                          <Chip
                            key={e.id}
                            label={`${e.name} (${e.commission}₱, ${e.commission && r.price ? Math.round((e.commission / r.price) * 100) : 0}% )`}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                            onClick={ev => ev.stopPropagation()}
                          />
                        ))
                      : "-"
                    }
                  </TableCell>
                  {/* Status column: show Voided if voided, else Paid/Unpaid */}
                  <TableCell>
                    {r.voided ? (
                      <Chip
                        label="Voided"
                        color="error"
                        size="small"
                        onClick={ev => ev.stopPropagation()}
                      />
                    ) : (
                      <Chip
                        label={r.paid ? "Paid" : "Unpaid"}
                        color={r.paid ? "success" : "warning"}
                        size="small"
                        onClick={ev => ev.stopPropagation()}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {PAYMENT_METHODS.find(m => m.key === r.paymentMethod)?.label || r.paymentMethod || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center">No payment records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {/* Pagination controls */}
        {filteredRecords.length > 0 && (
          <Box sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 3,
            flexWrap: "wrap",
            gap: 2
          }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredRecords.length === 0 ? 0 : page * rowsPerPage + 1}
              {" - "}
              {Math.min((page + 1) * rowsPerPage, filteredRecords.length)}
              {" of "}
              {filteredRecords.length} records
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TextField
                select
                size="small"
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                sx={{ width: 90 }}
              >
                {[5, 10, 20, 50, 100].map(n => (
                  <MenuItem key={n} value={n}>{n} / page</MenuItem>
                ))}
              </TextField>
              <Pagination
                count={Math.ceil(filteredRecords.length / rowsPerPage)}
                page={page + 1}
                onChange={(_, value) => setPage(value - 1)}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                siblingCount={isMobile ? 0 : 1}
                size={isMobile ? "small" : "medium"}
              />
            </Box>
          </Box>
        )}
      </Box>
      {/* Add Service Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Service</DialogTitle>
        <DialogContent>
          {/* Loyalty Customer Selection */}
          {loyaltyCustomers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Select
                value={customerMode}
                onChange={e => {
                  setCustomerMode(e.target.value as "registered" | "manual");
                  setSelectedLoyaltyCustomer(null);
                  setSelectedLoyaltyCar(null);
                  setForm(f => ({
                    ...f,
                    customerName: "",
                    carName: "",
                    plateNumber: ""
                  }));
                }}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              >
                <MenuItem value="registered">Registered Customer</MenuItem>
                <MenuItem value="manual">Manual Entry</MenuItem>
              </Select>
              {customerMode === "registered" && (
                <>
                  <Autocomplete
                    options={loyaltyCustomers}
                    getOptionLabel={option => option.name}
                    value={selectedLoyaltyCustomer}
                    onChange={(_, val) => {
                      setSelectedLoyaltyCustomer(val);
                      setSelectedLoyaltyCar(null);
                    }}
                    renderInput={params => (
                      <TextField {...params} label="Select Customer" margin="normal" />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />
                  <Autocomplete
                    options={selectedLoyaltyCustomer?.cars || []}
                    getOptionLabel={option => `${option.carName} (${option.plateNumber})`}
                    value={selectedLoyaltyCar}
                    onChange={(_, val) => setSelectedLoyaltyCar(val)}
                    renderInput={params => (
                      <TextField {...params} label="Select Car" margin="normal" />
                    )}
                    disabled={!selectedLoyaltyCustomer}
                  />
                </>
              )}
            </Box>
          )}
          {/* Manual or Registered Entry Fields */}
          {(customerMode === "manual" || !loyaltyCustomers.length) && (
            <>
              <TextField
                label="Customer Name"
                fullWidth
                margin="normal"
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
              />
              <TextField
                label="Car Name"
                fullWidth
                margin="normal"
                value={form.carName}
                onChange={e => setForm(f => ({ ...f, carName: e.target.value }))}
              />
              <TextField
                label="Plate #"
                fullWidth
                margin="normal"
                value={form.plateNumber}
                onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))}
              />
            </>
          )}
          {/* Referrer selection */}
          <Select
            label="Referrer"
            fullWidth
            value={form.referrerId}
            onChange={e => handleReferrerChange(e.target.value)}
            displayEmpty
            sx={{ mt: 2 }}
            renderValue={selected => {
              if (!selected) return <span style={{ color: "#aaa" }}>Select Referrer (optional)</span>;
              const emp = employees.find(e => e.id === selected);
              return emp ? `${emp.firstName} ${emp.lastName}` : selected;
            }}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </MenuItem>
            ))}
          </Select>
          {form.referrerId && (
            <Box sx={{ mt: 2, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ minWidth: 120 }}>Referrer Commission (%)</Typography>
              <TextField
                label="Commission %"
                type="number"
                size="small"
                value={form.referrerCommission}
                onChange={ev => handleReferrerCommissionChange(Number(ev.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { min: 0, max: 100 }
                }}
                sx={{ width: 100 }}
              />
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                {peso(Math.round(((form.referrerCommission ?? 0) / 100) * form.price))}
              </Typography>
            </Box>
          )}
          <Select
            label="Variety"
            fullWidth
            value={form.variety}
            onChange={e => handleVarietyChange(e.target.value)}
            sx={{ mt: 2 }}
          >
            {VARIETIES.map(v => (
              <MenuItem key={v.key} value={v.key}>{v.label}</MenuItem>
            ))}
          </Select>
          <Select
            multiple
            label="Services"
            fullWidth
            value={form.serviceIds}
            onChange={handleServicesChange}
            input={<OutlinedInput label="Services" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((id) => {
                  const s = services.find(s => s.id === id);
                  return (
                    <Chip
                      key={id}
                      label={s ? `${s.name} (${peso(s.prices[form.variety] ?? 0)})` : id}
                      size="small"
                    />
                  );
                })}
              </Box>
            )}
            sx={{ mt: 2 }}
          >
            {services
              .filter(s => typeof s.prices[form.variety] === "number" && s.prices[form.variety] > 0)
              .map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({peso(s.prices[form.variety])})
                </MenuItem>
              ))}
          </Select>
          {/* Manual Service Entry */}
          <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
            <TextField
              label="Manual Service Name"
              value={manualServiceName}
              onChange={e => setManualServiceName(e.target.value)}
              size="small"
              sx={{ flex: 2 }}
            />
            <TextField
              label="Price"
              type="number"
              value={manualServicePrice}
              onChange={e => setManualServicePrice(Number(e.target.value))}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 1 }
              }}
            />
            <Button
              variant="outlined"
              onClick={handleAddManualService}
              disabled={!manualServiceName.trim() || manualServicePrice === "" || isNaN(Number(manualServicePrice)) || Number(manualServicePrice) < 0}
              sx={{ flexShrink: 0, minWidth: 40, height: 40 }}
            >
              Add
            </Button>
          </Box>
          {/* Show manual services as chips */}
          {manualServices.length > 0 && (
            <Box sx={{ mt: 1, mb: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {manualServices.map((svc, idx) => (
                <Chip
                  key={svc.name + idx}
                  label={`${svc.name} (${peso(svc.price)})`}
                  color="secondary"
                  onDelete={() => handleRemoveManualService(idx)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>
          )}
          <TextField
            label="Total Price"
            fullWidth
            margin="normal"
            value={form.price}
            InputProps={{
              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
              readOnly: true
            }}
            sx={{ mt: 2 }}
          />
          <Select
            multiple
            fullWidth
            value={form.employees.map(e => e.id)}
            onChange={handleEmployeesChange}
            input={<OutlinedInput label="Employees" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((id) => {
                  const emp = employees.find(e => e.id === id);
                  return (
                    <Chip
                      key={id}
                      label={emp ? `${emp.firstName} ${emp.lastName}` : id}
                      size="small"
                    />
                  );
                })}
              </Box>
            )}
            sx={{ mt: 2 }}
          >
            {employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </MenuItem>
            ))}
          </Select>
          {form.employees.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Labor Employee Commissions (%)</Typography>
              {form.employees.map(e => (
                <Box key={e.id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography sx={{ minWidth: 120 }}>{e.name}</Typography>
                  <TextField
                    label="Commission %"
                    type="number"
                    size="small"
                    value={form.commissions[e.id] ?? 0}
                    onChange={ev => handleCommissionChange(e.id, Number(ev.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      inputProps: { min: 0, max: 100 }
                    }}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2" sx={{ minWidth: 80 }}>
                    {peso(Math.round(((form.commissions[e.id] ?? 0) / 100) * form.price))}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {/* REMOVE Payment Method select from here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleProcessPayment}
            disabled={
              !form.customerName ||
              !form.carName ||
              !form.plateNumber ||
              (form.serviceIds.length === 0 && manualServices.length === 0)
              // No check for employees or referrer!
            }
          >
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
      {/* Process Payment Dialog */}
      <Dialog open={processDialogOpen} onClose={() => { setProcessDialogOpen(false); setPayLater(false); setPayingRecordId(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          {/* ADD Payment Method select here */}
          {!payLater && (
            <>
              <Select
                label="Payment Method"
                fullWidth
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                sx={{ mb: 2, mt: 1 }}
              >
                {PAYMENT_METHODS.map(m => (
                  <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>
                ))}
              </Select>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Total Amount: <b>{peso(form.price)}</b>
              </Typography>
              <TextField
                label="Amount Tendered"
                fullWidth
                margin="normal"
                type="number"
                value={amountTendered}
                onChange={e => setAmountTendered(Number(e.target.value))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>
                }}
              />
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {quickAmounts.map(q => (
                  <Button
                    key={q}
                    variant="outlined"
                    onClick={() => setAmountTendered(q)}
                    sx={{ minWidth: 80 }}
                  >
                    {peso(q)}
                  </Button>
                ))}
              </Box>
              <TextField
                label="Change"
                fullWidth
                margin="normal"
                value={change >= 0 ? peso(change) : "₱0"}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  readOnly: true
                }}
              />
            </>
          )}
          {/* Pay Later Option (only for new records, not for "Pay Now") */}
          {!payingRecordId && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant={payLater ? "contained" : "outlined"}
                color="warning"
                fullWidth
                onClick={() => setPayLater(v => !v)}
              >
                {payLater ? "Pay Later Selected" : "Pay Later (Record as Unpaid)"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {payLater
                  ? "This will record the service as unpaid. You can process payment later."
                  : "Or choose to pay later if payment will be collected after service."}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setProcessDialogOpen(false); setPayLater(false); setPayingRecordId(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddPayment}
            disabled={
              payLater
                ? false
                : typeof amountTendered !== "number" ||
                  isNaN(amountTendered) ||
                  amountTendered < form.price
            }
          >
            {payLater ? "Record as Unpaid" : "Confirm Payment"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Payment Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>Payment & Service Details</DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 1, sm: 3 } }}>
          {selectedRecord && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 2,
                flexWrap: "wrap"
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Customer Name</Typography>
                  <Typography>{selectedRecord.customerName}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Car Name</Typography>
                  <Typography>{selectedRecord.carName}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Plate #</Typography>
                  <Typography>{selectedRecord.plateNumber || "-"}</Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 2,
                flexWrap: "wrap"
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Variety</Typography>
                  <Typography>
                    {VARIETIES.find(v => v.key === selectedRecord.variety)?.label || selectedRecord.variety}
                  </Typography>
                </Box>
                <Box sx={{ flex: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Service(s) & Price</Typography>
                  <Box>
                    {(() => {
                      // Find auto services with price
                      const autoSvcs = Array.isArray(selectedRecord.serviceIds)
                        ? selectedRecord.serviceIds.map(id => {
                            const svc = services.find(s => s.id === id);
                            return svc
                              ? {
                                  name: svc.name,
                                  price: svc.prices?.[selectedRecord.variety] ?? 0
                                }
                              : null;
                          }).filter(Boolean)
                        : [];
                      // Manual services from DB (preferred)
                      const manualSvcs = Array.isArray(selectedRecord.manualServices)
                        ? selectedRecord.manualServices
                        : (
                            Array.isArray(selectedRecord.serviceNames)
                              ? selectedRecord.serviceNames.filter(name =>
                                  !autoSvcs.some(s => s && s.name === name)
                                ).map(name => {
                                  // Try to extract price from the serviceName if possible (format: "Service Name (₱123)")
                                  const match = name.match(/^(.*)\s+\(₱([\d,]+)\)$/);
                                  if (match) {
                                    return { name: match[1], price: Number(match[2].replace(/,/g, "")) };
                                  }
                                  return { name, price: undefined };
                                })
                              : []
                          );
                      // If only serviceName string, fallback
                      if (!Array.isArray(selectedRecord.serviceNames) && selectedRecord.serviceName) {
                        return (
                          <Typography>
                            {selectedRecord.serviceName} ({peso(selectedRecord.price)})
                          </Typography>
                        );
                      }
                      // Render all services
                      return (
                        <>
                          {autoSvcs.map((svc, idx) => (
                            <Typography key={svc!.name + idx}>
                              {svc!.name} <b>{peso(svc!.price)}</b>
                            </Typography>
                          ))}
                          {manualSvcs.map((svc, idx) => (
                            <Typography key={svc.name + idx}>
                              {svc.name}{" "}
                              <b>
                                {typeof svc.price === "number"
                                  ? peso(svc.price)
                                  : "(manual)"}
                              </b>
                            </Typography>
                          ))}
                        </>
                      );
                    })()}
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Price</Typography>
                  <Typography>{peso(selectedRecord.price)}</Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 2,
                flexWrap: "wrap"
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Cashier</Typography>
                  <Typography>
                    {selectedRecord.cashierFullName
                      ? selectedRecord.cashierFullName
                      : selectedRecord.cashier}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography>{new Date(selectedRecord.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  {selectedRecord.voided ? (
                    <Chip label="Voided" color="error" size="small" />
                  ) : (
                    <Chip
                      label={selectedRecord.paid ? "Paid" : "Unpaid"}
                      color={selectedRecord.paid ? "success" : "warning"}
                      size="small"
                    />
                  )}
                </Box>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Employees & Commissions</Typography>
                {Array.isArray(selectedRecord.employees) && selectedRecord.employees.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedRecord.employees.map(e => (
                      <Chip
                        key={e.id}
                        label={`${e.name} (${peso(e.commission)})`}
                        size="small"
                        color="primary"
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">-</Typography>
                )}
              </Box>
              {selectedRecord.referrer && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Referrer</Typography>
                  <Chip
                    label={`${selectedRecord.referrer.name} (${peso(selectedRecord.referrer.commission)})`}
                    size="small"
                    color="secondary"
                  />
                </Box>
              )}
              <Divider />
              <Box sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 2,
                flexWrap: "wrap"
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                  <Typography>
                    {PAYMENT_METHODS.find(m => m.key === selectedRecord.paymentMethod)?.label || selectedRecord.paymentMethod || "-"}
                  </Typography>
                </Box>
              </Box>
              {/* Show Amount Tendered and Change if paid */}
              {selectedRecord.paid && (
                <Box sx={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 2,
                  flexWrap: "wrap"
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Amount Tendered</Typography>
                    <Typography>
                      {typeof selectedRecord.amountTendered === "number"
                        ? peso(selectedRecord.amountTendered)
                        : "-"}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Change</Typography>
                    <Typography>
                      {typeof selectedRecord.change === "number"
                        ? peso(selectedRecord.change)
                        : "-"}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          {/* --- Void and Delete buttons for admin, if not voided --- */}
          {role === "admin" && selectedRecord && !selectedRecord.voided && (
            <>
              <Button
                color="error"
                variant="contained"
                onClick={() => handleVoidRecord(selectedRecord)}
              >
                Void Transaction
              </Button>
              <Button
                color="error"
                variant="outlined"
                onClick={() => handleDeleteRecord(selectedRecord)}
                sx={{ ml: 1 }}
              >
                Delete Transaction
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppSidebar>
  );
};

export default PaymentServicesPage;

