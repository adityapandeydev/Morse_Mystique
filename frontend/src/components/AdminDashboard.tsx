import { useState, useEffect, useCallback } from "react";
import { UserData, RegisteredUser } from '../types';
import { formatTime } from '../utils/formatters';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDashboard() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        // Initialize login state from localStorage
        return localStorage.getItem("adminLoggedIn") === "true";
    });
    const [loginMessage, setLoginMessage] = useState("");
    const [emails, setEmails] = useState("");
    const [addMessage, setAddMessage] = useState("");
    const [token, setToken] = useState(() => {
        // Initialize token from localStorage
        return localStorage.getItem("adminToken") ?? "";
    });
    const [showRegister, setShowRegister] = useState(false);
    const [registerData, setRegisterData] = useState({
        name: "",
        email: "",
        password: ""
    });
    const [users, setUsers] = useState<UserData[]>([]);
    const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
    const [showRegisteredUsers, setShowRegisteredUsers] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState("");
    const [showAddUsers, setShowAddUsers] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add reload warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ""; // Required for Chrome
            return "Are you sure you want to leave? Your progress may be lost.";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    // Add keypress handlers
    const handleLoginKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    };

    const handleRegisterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRegister();
        }
    };

    

    const handleAdminLogin = async () => {
        try {
            const response = await fetch(`${API_URL}/api/2026x/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (data.success) {
                setIsLoggedIn(true);
                setToken(data.token);
                setLoginMessage("");
                // Store login state and token
                localStorage.setItem("adminLoggedIn", "true");
                localStorage.setItem("adminToken", data.token);
            } else {
                setLoginMessage("Login failed: " + data.message);
            }
        } catch (error) {
            setLoginMessage("Server error. Please try again." + error);
        }
    };

    const handleRegister = async () => {
        try {
            const response = await fetch(`${API_URL}/api/2026x/register`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: 'include',
                body: JSON.stringify(registerData),
            });

            const data = await response.json();
            if (data.success) {
                setShowRegister(false);
                setLoginMessage("Registration successful! Please login.");
            } else {
                setLoginMessage("Registration failed: " + data.message);
            }
        } catch (error) {
            console.error("Registration error:", error);
            setLoginMessage("Server error during registration. Please try again later.");
        }
    };

    const handleAddUsers = async () => {
        const emailList = emails.split('\n').map(email => email.trim()).filter(email => email);
        
        try {
            const results = await Promise.all(
                emailList.map(email =>
                    fetch(`${API_URL}/api/2026x/add-user`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ email })
                    })
                )
            );

            const successCount = results.filter(r => r.ok).length;
            setAddMessage(`Successfully added ${successCount} out of ${emailList.length} users`);
            setEmails("");
        } catch (error) {
            setAddMessage("Error adding users. Please try again." + error);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setToken("");
        setEmails("");
        setAddMessage("");
        // Clear login state from localStorage
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminToken");
    };

    // Wrap fetch functions with useCallback
    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/2026x/users`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                const sortedUsers = data.users.sort((a: UserData, b: UserData) => {
                    if (b.solved_count !== a.solved_count) {
                        return b.solved_count - a.solved_count;
                    }
                    return (a.total_time ?? Infinity) - (b.total_time ?? Infinity);
                });
                setUsers(sortedUsers);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, [token]);

    const fetchRegisteredUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/2026x/registered-users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setRegisteredUsers(data.users || []);
            } else {
                setError(data.message || "Failed to fetch registered users");
            }
        } catch (error) {
            console.error("Error fetching registered users:", error);
            setError("Failed to fetch registered users");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Update useEffect to only run on mount and login state change
    useEffect(() => {
        if (isLoggedIn) {
            if (showRegisteredUsers) {
                fetchRegisteredUsers();
            } else {
                fetchUsers();
            }
        }
    }, [isLoggedIn, showRegisteredUsers, fetchRegisteredUsers, fetchUsers]);

    const handleDeleteUser = async (email: string) => {
        if (!window.confirm(`Are you sure you want to delete user: ${email}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/2026x/delete-user`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (data.success) {
                setDeleteMessage(`Successfully deleted user: ${email}`);
                // Refresh user lists
                fetchUsers();
                fetchRegisteredUsers();
            } else {
                setDeleteMessage(data.message || "Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            setDeleteMessage("Server error while deleting user");
        }
    };

    // Add this helper function to determine what to render
    const renderTableContent = (
        isLoading: boolean, 
        error: string | null, 
        showRegisteredUsers: boolean, 
        users: UserData[], 
        registeredUsers: RegisteredUser[]
    ) => {
        if (isLoading) {
            return <div className="text-center py-4">Loading...</div>;
        }
        
        if (error) {
            return <div className="text-red-400 text-center py-4">{error}</div>;
        }

        const currentData = showRegisteredUsers ? registeredUsers : users;
        if (currentData.length === 0) {
            return <div className="text-center py-4">No users found</div>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="p-2">Email</th>
                            {showRegisteredUsers ? (
                                <th className="p-2">Added By</th>
                            ) : (
                                <>
                                    <th className="p-2">Solved</th>
                                    <th className="p-2">Time</th>
                                    <th className="p-2">Remaining</th>
                                </>
                            )}
                            <th className="p-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(currentData as (UserData | RegisteredUser)[]).map((user) => (
                            <tr key={user.email_id} className="border-b border-gray-700">
                                <td className="p-2">{user.email_id}</td>
                                {showRegisteredUsers ? (
                                    <td className="p-2">{(user as RegisteredUser).added_by}</td>
                                ) : (
                                    <>
                                        <td className="p-2">{(user as UserData).solved_count}/5</td>
                                        <td className="p-2">{(user as UserData).total_time ? formatTime((user as UserData).total_time!) : '-'}</td>
                                        <td className="p-2">{(user as UserData).remaining_time ? formatTime((user as UserData).remaining_time!) : '-'}</td>
                                    </>
                                )}
                                <td className="p-2">
                                    <button
                                        onClick={() => handleDeleteUser(user.email_id)}
                                        className="px-3 py-1 bg-red-500 hover:bg-red-400 rounded-md"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
                <h1 className="text-4xl font-bold mb-6">Admin {showRegister ? 'Registration' : 'Login'}</h1>
                <div className="flex flex-col gap-4 w-80">
                    {showRegister ? (
                        <>
                            <input
                                type="text"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 text-lg"
                                placeholder="Admin Name"
                                value={registerData.name}
                                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                                autoFocus
                            />
                            <input
                                type="email"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 text-lg"
                                placeholder="Email"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                                onKeyPress={handleRegisterKeyPress}
                            />
                            <input
                                type="password"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 text-lg"
                                placeholder="Password"
                                value={registerData.password}
                                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                                onKeyPress={handleRegisterKeyPress}
                            />
                            <button
                                className="mt-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-md"
                                onClick={handleRegister}
                            >
                                Register
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="email"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 text-lg"
                                placeholder="Admin Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyPress={handleLoginKeyPress}
                                autoFocus
                            />
                            <input
                                type="password"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 text-lg"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleLoginKeyPress}
                            />
                            <button
                                className="mt-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-md"
                                onClick={handleAdminLogin}
                            >
                                Login
                            </button>
                        </>
                    )}
                    <button
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => {
                            setShowRegister(!showRegister);
                            setLoginMessage("");
                        }}
                    >
                        {showRegister ? 'Back to Login' : 'Register as Admin'}
                    </button>
                    {loginMessage && <p className="mt-2 text-red-400 text-center">{loginMessage}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-r from-gray-900 to-black text-white">
            <div className="p-4 flex justify-between items-center">
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowRegisteredUsers(!showRegisteredUsers)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-md"
                    >
                        {showRegisteredUsers ? 'View Users' : 'View Registered Users'}
                    </button>
                    <button
                        onClick={() => setShowAddUsers(!showAddUsers)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-md"
                    >
                        {showAddUsers ? 'Hide Add Users' : 'Add Users'}
                    </button>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded-md"
                >
                    Logout
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center p-6 gap-8">
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                
                {/* User Tables */}
                <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">
                        {showRegisteredUsers ? 'Registered Users' : 'Active Users'}
                    </h2>
                    {renderTableContent(isLoading, error, showRegisteredUsers, users, registeredUsers)}
                    {deleteMessage && (
                        <p className={`mt-4 text-center ${deleteMessage.includes("Successfully") ? "text-green-400" : "text-red-400"}`}>
                            {deleteMessage}
                        </p>
                    )}
                </div>

                {/* Add Users Section - Only show when toggled */}
                {showAddUsers && (
                    <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Add Users</h2>
                        <p className="text-gray-400 mb-4">Enter one email per line to add multiple users</p>
                        <textarea
                            className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 min-h-[200px] text-lg"
                            placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                        />
                        <button
                            className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-md w-full"
                            onClick={handleAddUsers}
                        >
                            Add Users
                        </button>
                        {addMessage && (
                            <p className={`mt-4 text-center ${addMessage.includes("Error") ? "text-red-400" : "text-green-400"}`}>
                                {addMessage}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}