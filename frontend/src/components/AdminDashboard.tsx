import { useState, useEffect } from "react";

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
            const response = await fetch(`${API_URL}/api/admin/login`, {
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
            const response = await fetch(`${API_URL}/api/admin/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
            setLoginMessage("Server error during registration: " + error);
        }
    };

    const handleAddUsers = async () => {
        const emailList = emails.split('\n').map(email => email.trim()).filter(email => email);
        
        try {
            const results = await Promise.all(
                emailList.map(email =>
                    fetch(`${API_URL}/api/admin/add-user`, {
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
            <div className="p-4 flex justify-end">
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded-md"
                >
                    Logout
                </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <h1 className="text-4xl font-bold mb-6">Admin Dashboard</h1>
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
            </div>
        </div>
    );
} 