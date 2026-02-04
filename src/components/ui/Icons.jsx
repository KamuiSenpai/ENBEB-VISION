import * as Lucide from 'lucide-react';

// Safe icon retriever to prevent "undefined" errors
const getIcon = (names, fallback = Lucide.HelpCircle) => {
    for (const name of names) {
        if (Lucide[name]) return Lucide[name];
    }
    console.warn(`Icon not found: ${names.join(' or ')}`);
    return fallback;
};

export const Icons = {
    // Layout & Navigation
    Dashboard: getIcon(['LayoutDashboard', 'Home']),
    Menu: getIcon(['Menu']),
    X: getIcon(['X']),
    LogOut: getIcon(['LogOut']),

    // Commerce
    Cart: getIcon(['ShoppingCart']),
    ShoppingCart: getIcon(['ShoppingCart']), // Alias for backward compatibility
    ShoppingBag: getIcon(['ShoppingBag']),
    Package: getIcon(['Package']),
    Wallet: getIcon(['Wallet']),
    Dollar: getIcon(['DollarSign', 'Dollar']),
    DollarSign: getIcon(['DollarSign', 'Dollar']),
    CreditCard: getIcon(['CreditCard']),
    Banknote: getIcon(['Banknote']),
    Truck: getIcon(['Truck']),
    Box: getIcon(['Box', 'Package']),
    Tag: getIcon(['Tag']),

    // Entities
    Users: getIcon(['Users']),
    User: getIcon(['User']),
    UserCheck: getIcon(['UserCheck']),
    Building: getIcon(['Building']),

    // Actions
    Search: getIcon(['Search']),
    Archive: getIcon(['Archive']),
    Download: getIcon(['Download']),
    DownloadCloud: getIcon(['DownloadCloud']),
    RefreshCw: getIcon(['RefreshCw']),
    Clipboard: getIcon(['Clipboard']),
    Edit: getIcon(['Pencil', 'Edit', 'Edit2', 'Edit3']), // Fallback chain
    Trash: getIcon(['Trash', 'Trash2']),
    Filter: getIcon(['Filter']),
    Plus: getIcon(['Plus']),
    PlusCircle: getIcon(['PlusCircle']),
    View: getIcon(['Eye', 'View']), // Eye
    Eye: getIcon(['Eye']),

    // Charts & Trends
    TrendingUp: getIcon(['TrendingUp']),
    TrendingDown: getIcon(['TrendingDown']),
    Activity: getIcon(['Activity']),
    Target: getIcon(['Target']),
    BarChart: getIcon(['ChartBar', 'BarChart3', 'BarChart2', 'BarChart']),
    BarChart2: getIcon(['BarChart2', 'BarChart3', 'ChartBar', 'BarChart']),
    PieChart: getIcon(['PieChart']),

    // Feedback & Status
    Bell: getIcon(['Bell']),
    Award: getIcon(['Award']),
    Percent: getIcon(['Percent']),
    Check: getIcon(['Check']),
    Alert: getIcon(['TriangleAlert', 'AlertTriangle', 'AlertCircle']),
    Zap: getIcon(['Zap']),
    Star: getIcon(['Star']),

    // Arrows
    ArrowUp: getIcon(['ArrowUp']),
    ArrowDown: getIcon(['ArrowDown']),
    ArrowDownLeft: getIcon(['ArrowDownLeft', 'ArrowDown']),
    ArrowUpRight: getIcon(['ArrowUpRight', 'ArrowUp']),

    // Misc
    FileText: getIcon(['FileText']),
    Clock: getIcon(['Clock']),
    History: getIcon(['History']),
    ScrollText: getIcon(['ScrollText']),
    Calendar: getIcon(['Calendar']),
    Inbox: getIcon(['Inbox']),
    Phone: getIcon(['Phone']),
    MapPin: getIcon(['MapPin']),
    Mail: getIcon(['Mail']),
    MessageCircle: getIcon(['MessageCircle']),
    Scale: getIcon(['Scale', 'Balance']),
    Database: getIcon(['Database']),
    Camera: getIcon(['Camera']),
    Upload: getIcon(['Upload']),
    Loader: getIcon(['Loader', 'Loader2']),
    AlertTriangle: getIcon(['AlertTriangle', 'TriangleAlert']),

    // Theme Toggle
    Sun: getIcon(['Sun']),
    Moon: getIcon(['Moon']),

    // Arrows extra
    ChevronDown: getIcon(['ChevronDown']),
    ChevronUp: getIcon(['ChevronUp']),
    ChevronLeft: getIcon(['ChevronLeft']),
    ChevronRight: getIcon(['ChevronRight']),
    ArrowRight: getIcon(['ArrowRight']),
    ChevronsUpDown: getIcon(['ChevronsUpDown', 'ArrowUpDown', 'Code']),

    // Fallback for missing
    Help: Lucide.HelpCircle || Lucide.CircleHelp
};

