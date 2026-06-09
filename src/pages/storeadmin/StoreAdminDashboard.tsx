import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Store, Users, Package, Warehouse, Coins, Save, Search, Plus, AlertCircle, CheckCircle2, Shield, CalendarDays, Camera, QrCode, ScanLine, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { parseMemberQrPayload } from '../../lib/memberQr';
import { supabase } from '../../lib/supabase';
import { normalizeStoreLocation, type StoreLocation } from '../../lib/storeLocations';
import type { Product, StoreInventoryMovement, StoreLocationManager, StorePointRedemption } from '../../types';
import { formatCurrency } from '../../lib/utils';

type StoreForm = {
  name: string;
  name_en: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  hours_primary: string;
  hours_secondary: string;
  image_url: string;
  map_url: string;
  is_active: boolean;
  manager_notes: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  sku: string;
  image_url: string;
  is_active: boolean;
};

type MovementForm = {
  product_id: string;
  movement_type: StoreInventoryMovement['movement_type'];
  quantity: string;
  unit_cost: string;
  supplier_name: string;
  invoice_no: string;
  purchase_date: string;
  note: string;
};

type RedemptionForm = {
  user_id: string;
  points_used: string;
  discount_amount: string;
  used_at: string;
  note: string;
};

type ManagerForm = {
  user_id: string;
  role: StoreLocationManager['role'];
  can_manage_store_info: boolean;
  can_manage_products: boolean;
  can_manage_inventory: boolean;
  can_manage_points: boolean;
};

type SearchResult = { user_id: string; display_name: string };

const emptyStoreForm: StoreForm = {
  name: '',
  name_en: '',
  city: '',
  district: '',
  address: '',
  phone: '',
  hours_primary: '',
  hours_secondary: '',
  image_url: '',
  map_url: '',
  is_active: true,
  manager_notes: '',
};

const emptyProductForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock_quantity: '0',
  sku: '',
  image_url: '',
  is_active: true,
};

const emptyMovementForm: MovementForm = {
  product_id: '',
  movement_type: 'purchase',
  quantity: '1',
  unit_cost: '0',
  supplier_name: '',
  invoice_no: '',
  purchase_date: new Date().toISOString().slice(0, 10),
  note: '',
};

const emptyRedemptionForm: RedemptionForm = {
  user_id: '',
  points_used: '',
  discount_amount: '',
  used_at: new Date().toISOString(),
  note: '',
};

const emptyManagerForm: ManagerForm = {
  user_id: '',
  role: 'manager',
  can_manage_store_info: true,
  can_manage_products: true,
  can_manage_inventory: true,
  can_manage_points: true,
};

function getHoursFormValue(hours: StoreLocation['hours']) {
  return {
    hours_primary: hours?.primary || '',
    hours_secondary: hours?.secondary || '',
  };
}

export default function StoreAdminDashboard() {
  const { user, role, storeAssignments, hasStorePermission } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [storeForm, setStoreForm] = useState<StoreForm>(emptyStoreForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);
  const [redemptionForm, setRedemptionForm] = useState<RedemptionForm>(emptyRedemptionForm);
  const [managerForm, setManagerForm] = useState<ManagerForm>(emptyManagerForm);
  const [managerQuery, setManagerQuery] = useState('');
  const [managerResults, setManagerResults] = useState<SearchResult[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<SearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<SearchResult | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScannerLoading, setQrScannerLoading] = useState(false);
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);
  const [qrScannerHint, setQrScannerHint] = useState('');
  const [managers, setManagers] = useState<StoreLocationManager[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StoreInventoryMovement[]>([]);
  const [redemptions, setRedemptions] = useState<StorePointRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrTimerRef = useRef<number | null>(null);
  const qrDetectorRef = useRef<BarcodeDetector | null>(null);
  const qrProcessingRef = useRef(false);

  const isElevated = role === 'admin' || role === 'superadmin';
  const assignedStoreIds = useMemo(() => storeAssignments.map(item => item.store_location_id), [storeAssignments]);
  const visibleStores = useMemo(
    () => (isElevated ? stores : stores.filter(store => (vendorId && store.vendor_id === vendorId) || assignedStoreIds.includes(store.id))),
    [assignedStoreIds, isElevated, stores, vendorId],
  );
  const selectedStore = useMemo(() => stores.find(store => store.id === selectedStoreId) || null, [selectedStoreId, stores]);
  const canManageStore = (storeId: string, permission: 'any' | 'info' | 'products' | 'inventory' | 'points' = 'any') => {
    const store = stores.find(item => item.id === storeId);
    const isVendorOwner = !!store && !!vendorId && store.vendor_id === vendorId;
    return isElevated || isVendorOwner || hasStorePermission(storeId, permission);
  };
  const canEditStoreInfo = !!selectedStoreId && canManageStore(selectedStoreId, 'info');
  const canEditProducts = !!selectedStoreId && canManageStore(selectedStoreId, 'products');
  const canEditInventory = !!selectedStoreId && canManageStore(selectedStoreId, 'inventory');
  const canEditPoints = !!selectedStoreId && canManageStore(selectedStoreId, 'points');

  const loadStores = async (currentVendorId: string | null) => {
    let query = supabase
      .from('store_locations')
      .select('id,vendor_id,name,name_en,slug,city,district,address,phone,hours,image_url,map_url,sort_order,is_active,source_url,source_image_url,manager_notes,created_at,updated_at')
      .order('sort_order', { ascending: true });
    if (!isElevated) {
      query = currentVendorId
        ? query.eq('vendor_id', currentVendorId)
        : query.in('id', assignedStoreIds.length ? assignedStoreIds : ['00000000-0000-0000-0000-000000000000']);
    }
    const filtered = query;
    const { data, error } = await filtered;
    if (error) throw error;
    return ((data || []) as StoreLocation[]).map((row, index) => normalizeStoreLocation(row, index));
  };

  const loadManagers = async (storeId: string) => {
    if (!canManageStore(storeId, 'info')) {
      setManagers([]);
      return;
    }
    const { data, error } = await supabase
      .from('store_location_managers')
      .select('id,store_location_id,user_id,role,can_manage_store_info,can_manage_products,can_manage_inventory,can_manage_points,is_active,created_at,updated_at')
      .eq('store_location_id', storeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setManagers((data || []) as StoreLocationManager[]);
  };

  const loadStoreData = async (storeId: string) => {
    const [
      { data: productRows, error: productError },
      { data: movementRows, error: movementError },
      { data: redemptionRows, error: redemptionError },
    ] = await Promise.all([
      supabase.from('products')
        .select('id,category_id,vendor_id,store_location_id,name,description,price,image_url,stock_quantity,is_active,sku,origin,roast_level,processing_method,flavor_notes,tags,created_at,updated_at')
        .eq('store_location_id', storeId)
        .order('updated_at', { ascending: false }),
      supabase.from('store_inventory_movements')
        .select('id,store_location_id,product_id,movement_type,quantity,unit_cost,supplier_name,invoice_no,purchase_date,note,created_by,created_at,updated_at,products(id,name,price,stock_quantity,is_active,sku)')
        .eq('store_location_id', storeId)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('store_point_redemptions')
        .select('id,store_location_id,user_id,points_used,discount_amount,reference_type,reference_id,note,used_at,created_by,created_at,updated_at')
        .eq('store_location_id', storeId)
        .order('used_at', { ascending: false }),
    ]);
    if (productError) throw productError;
    if (movementError) throw movementError;
    if (redemptionError) throw redemptionError;
    setProducts((productRows || []) as Product[]);
    setMovements((movementRows || []) as unknown as StoreInventoryMovement[]);
    setRedemptions((redemptionRows || []) as StorePointRedemption[]);
  };

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      const { data: vendorRow } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const currentVendorId = vendorRow?.id || null;
      setVendorId(currentVendorId);

      const storeRows = await loadStores(currentVendorId);
      setStores(storeRows);
      const nextStoreId = storeRows.some(store => store.id === selectedStoreId)
        ? selectedStoreId
        : storeRows[0]?.id || '';
      setSelectedStoreId(nextStoreId);
      if (nextStoreId) {
        const current = storeRows.find(store => store.id === nextStoreId);
        if (current) {
          setStoreForm({
            name: current.name || '',
            name_en: current.name_en || '',
            city: current.city || '',
            district: current.district || '',
            address: current.address || '',
            phone: current.phone || '',
            ...getHoursFormValue(current.hours),
            image_url: current.image_url || '',
            map_url: current.map_url || '',
            is_active: current.is_active,
            manager_notes: current.manager_notes || '',
          });
          await Promise.all([loadStoreData(nextStoreId), loadManagers(nextStoreId)]);
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : pick('載入門市管理資料失敗', 'Failed to load store admin data', '店舗管理データの読み込みに失敗しました。', '매장 관리 데이터를 불러오지 못했습니다.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, storeAssignments.length]);

  useEffect(() => {
    if (!selectedStoreId) return;
    const current = stores.find(store => store.id === selectedStoreId);
    if (!current) return;
    setStoreForm({
      name: current.name || '',
      name_en: current.name_en || '',
      city: current.city || '',
      district: current.district || '',
      address: current.address || '',
      phone: current.phone || '',
      ...getHoursFormValue(current.hours),
      image_url: current.image_url || '',
      map_url: current.map_url || '',
      is_active: current.is_active,
      manager_notes: current.manager_notes || '',
    });
    setProductForm(emptyProductForm);
    setMovementForm(prev => ({ ...emptyMovementForm, product_id: prev.product_id }));
    setRedemptionForm(emptyRedemptionForm);
    setManagerForm(emptyManagerForm);
    setManagerQuery('');
    setMemberQuery('');
    setManagerResults([]);
    setMemberResults([]);
    setSelectedMember(null);
    setQrScannerHint('');
    setQrScannerError(null);
    closeQrScanner();
    void Promise.all([loadStoreData(selectedStoreId), loadManagers(selectedStoreId)])
      .catch(error => setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : pick('載入門市資料失敗', 'Failed to load store data', '店舗データの読み込みに失敗しました。', '매장 데이터를 불러오지 못했습니다.'),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId]);

  useEffect(() => {
    if (!managerQuery.trim() || !canEditStoreInfo) {
      setManagerResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from('tbl_mn5wgzh0')
        .select('user_id,display_name')
        .ilike('display_name', `%${managerQuery.trim()}%`)
        .limit(8);
      if (!error) setManagerResults((data || []) as SearchResult[]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [managerQuery, canEditStoreInfo]);

  useEffect(() => {
    if (!memberQuery.trim()) {
      setMemberResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from('tbl_mn5wgzh0')
        .select('user_id,display_name')
        .ilike('display_name', `%${memberQuery.trim()}%`)
        .limit(8);
      if (!error) setMemberResults((data || []) as SearchResult[]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [memberQuery]);

  useEffect(() => {
    return () => {
      if (qrTimerRef.current) {
        window.clearInterval(qrTimerRef.current);
        qrTimerRef.current = null;
      }
      qrStreamRef.current?.getTracks().forEach(track => track.stop());
      qrStreamRef.current = null;
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = null;
      }
    };
  }, []);

  const closeQrScanner = () => {
    setQrScannerOpen(false);
    setQrScannerLoading(false);
    setQrScannerError(null);
    setQrScannerHint('');
    if (qrTimerRef.current) {
      window.clearInterval(qrTimerRef.current);
      qrTimerRef.current = null;
    }
    qrStreamRef.current?.getTracks().forEach(track => track.stop());
    qrStreamRef.current = null;
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }
  };

  const applyMemberSelection = async (member: SearchResult) => {
    setSelectedMember(member);
    setRedemptionForm(prev => ({ ...prev, user_id: member.user_id }));
    setMemberQuery('');
    setMemberResults([]);
    setMessage({
      type: 'info',
      text: `Selected member: ${member.display_name || member.user_id}`,
    });
  };

  const resolveMemberByUserId = async (userId: string) => {
    const { data, error } = await supabase
      .from('tbl_mn5wgzh0')
      .select('user_id,display_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    await applyMemberSelection({
      user_id: userId,
      display_name: (data?.display_name || userId).trim(),
    });
  };

  const handleQrPayload = async (payload: string) => {
    const userId = parseMemberQrPayload(payload);
    if (!userId) {
      setQrScannerError('無法辨識這個 QR 內容，請改掃會員碼或直接輸入 User ID。');
      return;
    }
    setQrScannerError(null);
    setQrScannerHint('正在帶入會員資料…');
    await resolveMemberByUserId(userId);
    setQrScannerHint('已完成掃描，可直接輸入點數並送出。');
  };

  const startQrScanner = async () => {
    if (!selectedStoreId || !canEditPoints) return;
    setQrScannerOpen(true);
    setQrScannerLoading(true);
    setQrScannerError(null);
    setQrScannerHint('請將會員 QR 放入畫面中央。');
    try {
      if (!('BarcodeDetector' in window)) {
        setQrScannerError('這個瀏覽器不支援即時 QR 掃描，請改用圖片掃描或手動輸入。');
        setQrScannerLoading(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      qrStreamRef.current = stream;
      const video = qrVideoRef.current;
      if (!video) throw new Error('Scanner video is not ready.');
      video.srcObject = stream;
      await video.play();
      qrDetectorRef.current ||= new BarcodeDetector({ formats: ['qr_code'] });
      setQrScannerLoading(false);
      if (qrTimerRef.current) window.clearInterval(qrTimerRef.current);
      qrTimerRef.current = window.setInterval(async () => {
        if (qrProcessingRef.current || !qrVideoRef.current || qrVideoRef.current.readyState < 2) return;
        const detector = qrDetectorRef.current;
        if (!detector) return;
        qrProcessingRef.current = true;
        try {
          const codes = await detector.detect(qrVideoRef.current);
          const rawValue = codes[0]?.rawValue?.trim();
          if (rawValue) {
            await handleQrPayload(rawValue);
            closeQrScanner();
          }
        } catch {
          setQrScannerError('掃描失敗，請再試一次。');
        } finally {
          qrProcessingRef.current = false;
        }
      }, 600);
    } catch (error) {
      setQrScannerLoading(false);
      setQrScannerError(error instanceof Error ? error.message : '無法啟動相機，請檢查權限或改用手動輸入。');
    }
  };

  const scanQrFromImage = async (file: File) => {
    if (!('BarcodeDetector' in window)) {
      setQrScannerError('這個瀏覽器不支援圖片 QR 掃描。');
      setQrScannerLoading(false);
      return;
    }
    try {
      setQrScannerLoading(true);
      setQrScannerError(null);
      const detector = qrDetectorRef.current ||= new BarcodeDetector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();
      const rawValue = codes[0]?.rawValue?.trim();
      if (!rawValue) {
        setQrScannerError('圖片中沒有找到 QR Code。');
        return;
      }
      await handleQrPayload(rawValue);
      closeQrScanner();
    } catch (error) {
      setQrScannerLoading(false);
      setQrScannerError(error instanceof Error ? error.message : '圖片掃描失敗。');
    } finally {
      setQrScannerLoading(false);
    }
  };
  const saveStore = async () => {
    if (!selectedStoreId) return;
    if (!canEditStoreInfo) {
      setMessage({ type: 'error', text: pick('你沒有這間門市的管理權限。', 'You do not have permission to manage this store.', 'この店舗を管理する権限がありません。', '이 매장을 관리할 권한이 없습니다.') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        name: storeForm.name.trim(),
        name_en: storeForm.name_en.trim(),
        city: storeForm.city.trim(),
        district: storeForm.district.trim(),
        address: storeForm.address.trim(),
        phone: storeForm.phone.trim(),
        hours: { primary: storeForm.hours_primary.trim(), secondary: storeForm.hours_secondary.trim() || undefined },
        image_url: storeForm.image_url.trim(),
        map_url: storeForm.map_url.trim(),
        is_active: storeForm.is_active,
        manager_notes: storeForm.manager_notes.trim(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('store_locations').update(payload).eq('id', selectedStoreId);
      if (error) throw error;
      setMessage({ type: 'success', text: pick('門市資訊已儲存', 'Store info saved', '店舗情報を保存しました。', '매장 정보가 저장되었습니다.') });
      await loadAll();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : pick('門市資訊儲存失敗', 'Failed to save store info', '店舗情報の保存に失敗しました。', '매장 정보 저장에 실패했습니다.') });
    } finally {
      setBusy(false);
    }
  };

  const assignManager = async (selected: SearchResult) => {
    if (!selectedStoreId) return;
    if (!canEditStoreInfo) {
      setMessage({ type: 'error', text: pick('只有門市資訊管理者可以指派門市管理員。', 'Only users with store info permission can assign store managers.', '店舗情報を管理できる人だけが店舗管理者を割り当てられます。', '매장 정보 권한이 있는 사람만 매장 관리자를 지정할 수 있습니다.') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('store_location_managers').upsert({
        store_location_id: selectedStoreId,
        user_id: selected.user_id,
        role: managerForm.role,
        can_manage_store_info: managerForm.can_manage_store_info,
        can_manage_products: managerForm.can_manage_products,
        can_manage_inventory: managerForm.can_manage_inventory,
        can_manage_points: managerForm.can_manage_points,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'store_location_id,user_id' });
      if (error) throw error;
      setMessage({ type: 'success', text: pick('門市管理員已指派', 'Manager assigned', '店舗管理者を割り当てました。', '매장 관리자가 지정되었습니다.') });
      setManagerQuery('');
      setManagerResults([]);
      await loadManagers(selectedStoreId);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : pick('指派門市管理員失敗', 'Failed to assign manager', '店舗管理者の割り当てに失敗しました。', '매장 관리자 지정에 실패했습니다.') });
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!selectedStoreId || !productForm.name.trim()) return;
    if (!canEditProducts) {
      setMessage({ type: 'error', text: pick('你沒有這間門市的商品管理權限。', 'You do not have permission to manage products for this store.', 'この店舗の商品を管理する権限がありません。', '이 매장의 상품을 관리할 권한이 없습니다.') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('products').insert({
        store_location_id: selectedStoreId,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price || 0),
        stock_quantity: Number(productForm.stock_quantity || 0),
        sku: productForm.sku.trim(),
        image_url: productForm.image_url.trim(),
        is_active: productForm.is_active,
      });
      if (error) throw error;
      setProductForm(emptyProductForm);
      setMessage({ type: 'success', text: pick('商品已建立', 'Product created', '商品を作成しました。', '상품이 생성되었습니다.') });
      await loadStoreData(selectedStoreId);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : pick('建立商品失敗', 'Failed to create product', '商品の作成に失敗しました。', '상품 생성에 실패했습니다.') });
    } finally {
      setBusy(false);
    }
  };

  const saveMovement = async () => {
    if (!selectedStoreId || !movementForm.product_id) return;
    if (!canEditInventory) {
      setMessage({ type: 'error', text: pick('你沒有這間門市的進貨管理權限。', 'You do not have permission to manage inventory for this store.', 'この店舗の在庫管理権限がありません。', '이 매장의 재고를 관리할 권한이 없습니다.') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('store_inventory_movements').insert({
        store_location_id: selectedStoreId,
        product_id: movementForm.product_id,
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity || 0),
        unit_cost: Number(movementForm.unit_cost || 0),
        supplier_name: movementForm.supplier_name.trim(),
        invoice_no: movementForm.invoice_no.trim(),
        purchase_date: movementForm.purchase_date,
        note: movementForm.note.trim(),
        created_by: user?.id || null,
      });
      if (error) throw error;
      setMovementForm(prev => ({ ...emptyMovementForm, product_id: prev.product_id }));
      setMessage({ type: 'success', text: pick('進貨紀錄已新增', 'Inventory log added', '在庫記録を追加しました。', '입고 기록이 추가되었습니다.') });
      await loadStoreData(selectedStoreId);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : pick('新增進貨紀錄失敗', 'Failed to add inventory log', '在庫記録の追加に失敗しました。', '입고 기록 추가에 실패했습니다.') });
    } finally {
      setBusy(false);
    }
  };

  const saveRedemption = async () => {
    if (!selectedStoreId || !redemptionForm.user_id || !redemptionForm.points_used) return;
    if (!canEditPoints) {
      setMessage({ type: 'error', text: pick('你沒有這間門市的點數折抵權限。', 'You do not have permission to redeem points for this store.', 'この店舗のポイント利用権限がありません。', '이 매장의 포인트 차감 권한이 없습니다.') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('store_point_redemptions').insert({
        store_location_id: selectedStoreId,
        user_id: redemptionForm.user_id,
        points_used: Number(redemptionForm.points_used || 0),
        discount_amount: Number(redemptionForm.discount_amount || 0),
        used_at: redemptionForm.used_at,
        note: redemptionForm.note.trim(),
        created_by: user?.id || null,
      });
      if (error) throw error;
      setRedemptionForm(emptyRedemptionForm);
      setMemberQuery('');
      setMemberResults([]);
      setSelectedMember(null);
      setMessage({ type: 'success', text: pick('點數折抵已新增', 'Point redemption logged', 'ポイント利用履歴を追加しました。', '포인트 차감 기록이 추가되었습니다.') });
      await loadStoreData(selectedStoreId);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : pick('新增點數折抵失敗', 'Failed to redeem points', 'ポイント利用の記録に失敗しました。', '포인트 차감 기록 추가에 실패했습니다.') });
    } finally {
      setBusy(false);
    }
  };

  const canManageManagers = canEditStoreInfo;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!visibleStores.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <Store className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900">{pick('尚未指派門市', 'No store assigned yet', 'まだ店舗が割り当てられていません', '아직 매장이 지정되지 않았습니다')}</h2>
        <p className="mt-2 text-sm text-slate-500">{pick('請先請超級管理員建立你的門市權限。', 'Ask a super admin to assign your store access first.', 'まずはスーパー管理者に店舗アクセスを割り当ててもらってください。', '먼저 최고 관리자에게 매장 접근 권한을 배정해 달라고 요청하세요.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <Shield className="h-4 w-4" />
            {pick('門市管理', 'Store Admin', '店舗管理', '매장 관리')}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{selectedStore?.name || pick('選擇門市', 'Select a store', '店舗を選択', '매장을 선택하세요')}</h1>
          <p className="mt-1 text-sm text-slate-500">{selectedStore?.city ? `${selectedStore.city} ${selectedStore.district}` : ''}</p>
        </div>
        <div className="min-w-[260px]">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{pick('切換門市', 'Switch store', '店舗を切り替える', '매장 전환')}</label>
          <select
            value={selectedStoreId}
            onChange={event => setSelectedStoreId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          >
            {visibleStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-sky-200 bg-sky-50 text-sky-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: pick('商品數', 'Products', '商品数', '상품 수'), value: products.length, icon: Package, tone: 'bg-amber-50 text-amber-700' },
          { label: pick('進貨紀錄', 'Inventory logs', '在庫記録', '입고 기록'), value: movements.length, icon: Warehouse, tone: 'bg-sky-50 text-sky-700' },
          { label: pick('折抵紀錄', 'Redemptions', '利用記録', '차감 기록'), value: redemptions.length, icon: Coins, tone: 'bg-emerald-50 text-emerald-700' },
          { label: pick('管理員', 'Managers', '管理者', '관리자'), value: managers.length, icon: Users, tone: 'bg-violet-50 text-violet-700' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pick('門市資訊', 'Store profile', '店舗情報', '매장 정보')}</h2>
              <p className="text-sm text-slate-500">{pick('可更新名稱、電話、地址與備註。', 'Update the store name, contact details, and notes.', '店舗名、連絡先、備考を更新します。', '매장 이름, 연락처, 메모를 수정합니다.')}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={storeForm.name} onChange={e => setStoreForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('門市名稱', 'Store name', '店舗名', '매장명')} />
            <input value={storeForm.name_en} onChange={e => setStoreForm(prev => ({ ...prev, name_en: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('英文名稱', 'English name', '英語名', '영문명')} />
            <input value={storeForm.city} onChange={e => setStoreForm(prev => ({ ...prev, city: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('城市', 'City', '都市', '도시')} />
            <input value={storeForm.district} onChange={e => setStoreForm(prev => ({ ...prev, district: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('區域', 'District', '区', '구')} />
            <input value={storeForm.address} onChange={e => setStoreForm(prev => ({ ...prev, address: e.target.value }))} className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('地址', 'Address', '住所', '주소')} />
            <input value={storeForm.phone} onChange={e => setStoreForm(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('電話', 'Phone', '電話', '전화')} />
            <input value={storeForm.hours_primary} onChange={e => setStoreForm(prev => ({ ...prev, hours_primary: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('營業時間', 'Hours', '営業時間', '영업시간')} />
            <textarea value={storeForm.manager_notes} onChange={e => setStoreForm(prev => ({ ...prev, manager_notes: e.target.value }))} rows={3} className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('管理備註', 'Notes', '備考', '메모')} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={storeForm.is_active} onChange={e => setStoreForm(prev => ({ ...prev, is_active: e.target.checked }))} />
              {pick('啟用門市', 'Enable this store', 'この店舗を有効化', '이 매장 활성화')}
            </label>
            <button type="button" onClick={saveStore} disabled={busy || !canEditStoreInfo} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {pick('儲存', 'Save', '保存', '저장')}
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pick('門市管理員', 'Manager assignment', '店舗管理者', '매장 관리자')}</h2>
              <p className="text-sm text-slate-500">{pick('搜尋會員後可指派到這間門市。', 'Search a member and assign them to this store.', '会員を検索してこの店舗に割り当てます。', '회원을 검색해 이 매장에 지정합니다.')}</p>
            </div>
          </div>
          {!canManageManagers ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              {pick('你目前沒有這間門市的資訊管理權限。', 'You currently do not have info management permission for this store.', 'この店舗の情報管理権限がありません。', '현재 이 매장의 정보 관리 권한이 없습니다.')}
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={managerQuery} onChange={e => setManagerQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder={pick('搜尋會員名稱', 'Search member name', '会員名を検索', '회원 이름 검색')} />
                </div>
                <select value={managerForm.role} onChange={e => setManagerForm(prev => ({ ...prev, role: e.target.value as StoreLocationManager['role'] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <option value="manager">{pick('管理員', 'Manager', '管理者', '관리자')}</option>
                  <option value="assistant">{pick('副管理員', 'Assistant', 'アシスタント', '부관리자')}</option>
                  <option value="supervisor">{pick('主管', 'Supervisor', '責任者', '담당자')}</option>
                </select>
              </div>
              <div className="mt-3 space-y-2">
                {managerResults.length === 0 ? (
                  <p className="text-xs text-slate-400">{pick('搜尋結果會顯示在這裡。', 'Results will appear here.', '検索結果がここに表示されます。', '검색 결과가 여기에 표시됩니다.')}</p>
                ) : managerResults.map(result => (
                  <button key={result.user_id} type="button" onClick={() => assignManager(result)} disabled={busy} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60">
                    <span className="font-medium text-slate-800">{result.display_name}</span>
                    <Plus className="h-4 w-4 text-amber-600" />
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-100">
                {managers.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400">{pick('尚無門市管理員', 'No managers assigned yet.', 'まだ管理者は割り当てられていません。', '아직 지정된 관리자가 없습니다.')}</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {managers.map(manager => (
                      <div key={manager.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">{manager.user_id}</p>
                          <p className="text-xs text-slate-500">{manager.role}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${manager.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {manager.is_active ? pick('啟用', 'Active', '有効', '활성') : pick('停用', 'Inactive', '無効', '비활성')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pick('建立商品', 'Product setup', '商品作成', '상품 생성')}</h2>
              <p className="text-sm text-slate-500">{pick('同時建立商品與初始庫存。', 'Create the product and initial stock together.', '商品と初期在庫を同時に作成します。', '상품과 초기 재고를 함께 생성합니다.')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <input value={productForm.name} onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('商品名稱', 'Product name', '商品名', '상품명')} />
            <input type="number" min="0" value={productForm.price} onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('價格', 'Price', '価格', '가격')} />
            <input type="number" min="0" value={productForm.stock_quantity} onChange={e => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('初始庫存', 'Initial stock', '初期在庫', '초기 재고')} />
            <input value={productForm.sku} onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="SKU" />
            <input value={productForm.image_url} onChange={e => setProductForm(prev => ({ ...prev, image_url: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('圖片網址', 'Image URL', '画像 URL', '이미지 URL')} />
            <textarea value={productForm.description} onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('商品說明', 'Description', '説明', '설명')} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={productForm.is_active} onChange={e => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))} />
              {pick('上架商品', 'Publish product', '商品を公開する', '상품 게시')}
            </label>
            <button type="button" onClick={saveProduct} disabled={busy || !productForm.name.trim() || !canEditProducts} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pick('新增商品', 'Add product', '商品を追加', '상품 추가')}
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-sky-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pick('進貨管理', 'Inventory intake', '入庫管理', '입고 관리')}</h2>
              <p className="text-sm text-slate-500">{pick('記錄進貨日期、供應商與發票。', 'Track stock intake with purchase date and supplier.', '入庫日、仕入先、伝票番号を記録します。', '입고 날짜, 공급업체, 송장을 기록합니다.')}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={movementForm.product_id} onChange={e => setMovementForm(prev => ({ ...prev, product_id: e.target.value }))} className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">{pick('選擇商品', 'Select a product', '商品を選択', '상품 선택')}</option>
              {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <select value={movementForm.movement_type} onChange={e => setMovementForm(prev => ({ ...prev, movement_type: e.target.value as MovementForm['movement_type'] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="purchase">{pick('進貨', 'Purchase', '仕入', '입고')}</option>
              <option value="adjustment_in">{pick('調整入庫', 'Adjustment in', '在庫増加', '재고 증가')}</option>
              <option value="adjustment_out">{pick('調整出庫', 'Adjustment out', '在庫減少', '재고 감소')}</option>
              <option value="transfer_in">{pick('調撥入庫', 'Transfer in', '移動入庫', '이동 입고')}</option>
              <option value="transfer_out">{pick('調撥出庫', 'Transfer out', '移動出庫', '이동 출고')}</option>
              <option value="writeoff">{pick('報廢', 'Write-off', '廃棄', '폐기')}</option>
              <option value="sale">{pick('銷售', 'Sale', '販売', '판매')}</option>
            </select>
            <input type="number" min="1" value={movementForm.quantity} onChange={e => setMovementForm(prev => ({ ...prev, quantity: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('數量', 'Quantity', '数量', '수량')} />
            <input type="number" min="0" value={movementForm.unit_cost} onChange={e => setMovementForm(prev => ({ ...prev, unit_cost: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('單價', 'Unit cost', '単価', '단가')} />
            <input value={movementForm.supplier_name} onChange={e => setMovementForm(prev => ({ ...prev, supplier_name: e.target.value }))} className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('供應商', 'Supplier', '仕入先', '공급업체')} />
            <input value={movementForm.invoice_no} onChange={e => setMovementForm(prev => ({ ...prev, invoice_no: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('發票號碼', 'Invoice no.', '伝票番号', '송장 번호')} />
            <input type="date" value={movementForm.purchase_date} onChange={e => setMovementForm(prev => ({ ...prev, purchase_date: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <textarea value={movementForm.note} onChange={e => setMovementForm(prev => ({ ...prev, note: e.target.value }))} rows={2} className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('備註', 'Note', 'メモ', '메모')} />
            <button type="button" onClick={saveMovement} disabled={busy || !movementForm.product_id || !canEditInventory} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {pick('新增進貨', 'Add intake log', '入庫を追加', '입고 추가')}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pick('點數折抵', 'Point redemption', 'ポイント利用', '포인트 차감')}</h2>
              <p className="text-sm text-slate-500">{pick('將折抵點數與使用日期記錄到門市。', 'Redemptions are written to the ledger with date and store.', '店舗ごとの利用日とポイントを記録します。', '매장별 사용일과 포인트를 기록합니다.')}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void startQrScanner()}
                  disabled={busy || !canEditPoints}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                >
                  <QrCode className="h-4 w-4" />
                  {pick('掃描會員 QR', 'Scan member QR', '会員 QR をスキャン', '회원 QR 스캔')}
                </button>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setRedemptionForm(prev => ({ ...prev, user_id: '' }));
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                  >
                    <X className="h-4 w-4" />
                    {pick('清除會員', 'Clear member', '会員を解除', '회원 해제')}
                  </button>
                )}
              </div>
              {selectedMember && (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <span className="font-semibold">{pick('目前會員：', 'Current member: ', '現在の会員：', '현재 회원: ')}</span>
                  {selectedMember.display_name}
                  <span className="ml-2 font-mono text-xs text-emerald-700">{selectedMember.user_id}</span>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={memberQuery} onChange={e => setMemberQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder={pick('搜尋會員', 'Search member', '会員を検索', '회원 검색')} />
              </div>
              {memberResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  {memberResults.map(result => (
                    <button key={result.user_id} type="button" onClick={() => void applyMemberSelection(result)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50">
                      <span>{result.display_name}</span>
                      <Plus className="h-4 w-4 text-emerald-600" />
                    </button>
                  ))}
                </div>
              )}
              </div>
            <input type="number" min="1" value={redemptionForm.points_used} onChange={e => setRedemptionForm(prev => ({ ...prev, points_used: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('使用點數', 'Points used', '使用ポイント', '사용 포인트')} />
            <input type="number" min="0" value={redemptionForm.discount_amount} onChange={e => setRedemptionForm(prev => ({ ...prev, discount_amount: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('折抵金額', 'Discount amount', '割引金額', '할인 금액')} />
            <input type="datetime-local" value={redemptionForm.used_at.slice(0, 16)} onChange={e => setRedemptionForm(prev => ({ ...prev, used_at: new Date(e.target.value).toISOString() }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <textarea value={redemptionForm.note} onChange={e => setRedemptionForm(prev => ({ ...prev, note: e.target.value }))} rows={2} className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={pick('備註', 'Note', 'メモ', '메모')} />
            <button type="button" onClick={saveRedemption} disabled={busy || !redemptionForm.user_id || !redemptionForm.points_used || !canEditPoints} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              {pick('新增折抵', 'Log redemption', '利用を記録', '차감 기록 추가')}
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pick('最近紀錄', 'Recent records', '最近の記録', '최근 기록')}</h2>
              <p className="text-sm text-slate-500">{pick('快速查看商品、進貨與點數折抵。', 'Quickly review products, stock intake, and point redemptions.', '商品、入庫、ポイント利用をすばやく確認できます。', '상품, 입고, 포인트 차감을 빠르게 확인합니다.')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{pick('商品', 'Products', '商品', '상품')}</p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                {products.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400">{pick('尚無商品', 'No products yet', 'まだ商品がありません', '아직 상품이 없습니다')}</div>
                ) : products.map(product => (
                  <div key={product.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                    <div>
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.sku || 'SKU'} · {product.stock_quantity}</p>
                    </div>
                    <p className="font-semibold text-slate-900">{formatCurrency(Number(product.price || 0))}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{pick('進貨', 'Inventory', '入庫', '입고')}</p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                {movements.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400">{pick('尚無進貨紀錄', 'No inventory logs yet', 'まだ入庫記録がありません', '아직 입고 기록이 없습니다')}</div>
                ) : movements.map(movement => (
                  <div key={movement.id} className="border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{movement.products?.name || movement.product_id}</p>
                        <p className="text-xs text-slate-400">{movement.purchase_date} · {movement.movement_type}</p>
                      </div>
                      <p className="font-semibold text-slate-900">+{movement.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{pick('折抵', 'Redemptions', '利用', '차감')}</p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                {redemptions.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400">{pick('尚無折抵紀錄', 'No redemption logs yet', 'まだ利用記録がありません', '아직 차감 기록이 없습니다')}</div>
                ) : redemptions.map(redemption => (
                  <div key={redemption.id} className="border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{redemption.user_id}</p>
                        <p className="text-xs text-slate-400">{redemption.used_at}</p>
                      </div>
                      <p className="font-semibold text-rose-600">-{redemption.points_used} NP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {qrScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{pick('掃描會員 QR', 'Scan member QR', '会員 QR をスキャン', '회원 QR 스캔')}</h3>
                <p className="text-sm text-slate-500">{pick('請把會員 QR 放在鏡頭前，或上傳 QR 圖片。', 'Hold the member QR in front of the camera, or upload an image.', '会員 QR をカメラ前にかざすか、画像をアップロードしてください。', '회원 QR을 카메라 앞에 두거나 이미지를 업로드해 주세요.')}</p>
              </div>
              <button type="button" onClick={closeQrScanner} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl bg-slate-950">
                  <video ref={qrVideoRef} autoPlay muted playsInline className="aspect-[4/3] h-full w-full object-cover" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void startQrScanner()}
                    disabled={qrScannerLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {qrScannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {pick('重新啟動相機', 'Restart camera', 'カメラを再起動', '카메라 다시 시작')}
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
                    <ScanLine className="h-4 w-4" />
                    {pick('掃描圖片', 'Scan image', '画像を読み取る', '이미지 스캔')}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={event => {
                        const file = event.target.files?.[0];
                        if (file) void scanQrFromImage(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-3">
                {qrScannerError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{qrScannerError}</div>
                ) : null}
                {qrScannerHint ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{qrScannerHint}</div>
                ) : null}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{pick('可掃描的內容格式', 'Supported QR formats', '対応する QR フォーマット', '지원되는 QR 형식')}</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    <li>• {pick('nestobi:member:&lt;user_id&gt;', 'nestobi:member:&lt;user_id&gt;', 'nestobi:member:&lt;user_id&gt;', 'nestobi:member:&lt;user_id&gt;')}</li>
                    <li>• {pick('含有 user_id / member_id 的網址或 JSON', 'A URL or JSON containing user_id / member_id', 'user_id / member_id を含む URL または JSON', 'user_id / member_id가 포함된 URL 또는 JSON')}</li>
                    <li>• {pick('若 QR 掃不到，也可用下方搜尋會員', 'If scan fails, use the member search below.', '読み取れない場合は下の会員検索を使えます。', '스캔이 실패하면 아래 회원 검색을 사용하세요.')}</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  {pick('掃描後會自動帶入會員與 User ID，然後可直接輸入點數進行折抵。', 'After scanning, the member and User ID will be filled in automatically so you can enter points right away.', '読み取り後は会員と User ID が自動入力され、すぐにポイントを入力して利用できます。', '스캔 후 회원과 User ID가 자동 입력되어 바로 포인트를 입력해 차감할 수 있습니다.')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
