import React, {useEffect, useState} from "react";
import {Box, Button, Container, TextField, Typography} from "@mui/material";

const UserSettingsForm = () => {
    // Form state for user inputs
    const [formData, setFormData] = useState({
        company_name: "",
        username: "",
        email: ""
    });

    // State for response messages from the API
    const [responseMessage, setResponseMessage] = useState("");

    // State to hold the persisted customer info (if any)
    const [customer, setCustomer] = useState(null);

    // On mount, try to load stored customer info from local storage
    useEffect(() => {
        const storedCustomer = localStorage.getItem("customer");
        if (storedCustomer) {
            setCustomer(JSON.parse(storedCustomer));
        }
    }, []);

    const handleChange = (event) => {
        setFormData({...formData, [event.target.name]: event.target.value});
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setResponseMessage("");

        try {
            const response = await fetch("http://localhost:8000/create_customer/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setResponseMessage(`Customer Created! Client ID: ${data.client_id}`);

                // Persist the returned customer info in local storage as a JSON string
                localStorage.setItem("customer", JSON.stringify(data));
                setCustomer(data);

                // Optionally, notify Electron if needed
                window.electronAPI.ipcRenderer.send("user-settings-saved", formData);
            } else {
                setResponseMessage(`Error: ${data.detail}`);
            }
        } catch (error) {
            setResponseMessage("Failed to connect to the server.");
        }
    };

    const handleReset = () => {
        // Remove the customer info from localStorage
        localStorage.removeItem("customer");
        // Reset the customer state to null so that the form is shown
        setCustomer(null);
        // Optionally, clear the form fields too:
        setFormData({company_name: "", username: "", email: ""});
        setResponseMessage("Customer information has been cleared.");
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    mt: 4,
                    p: 3,
                    borderRadius: 2,
                    boxShadow: 3,
                    bgcolor: "background.paper"
                }}
            >
                <Typography variant="h5" gutterBottom>
                    User Settings
                </Typography>

                {customer ? (
                    // Display stored customer information if it exists
                    <Box>
                        <Typography variant="body1">Customer Information:</Typography>
                        <Typography variant="body2">
                            <strong>Client ID:</strong> {customer.client_id}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Company Name:</strong> {customer.company_name}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Username:</strong> {customer.username}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Email:</strong> {customer.email}
                        </Typography>
                        <Button
                            variant="outlined"
                            color="secondary"
                            sx={{mt: 2}}
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    </Box>
                ) : (
                    // Render the form if no customer info is stored
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Company Name"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            margin="normal"
                            type="email"
                            required
                        />
                        <Button type="submit" variant="contained" color="primary" sx={{mt: 2}}>
                            Save
                        </Button>
                    </form>
                )}

                {responseMessage && (
                    <Typography variant="body1" sx={{mt: 2, color: "green"}}>
                        {responseMessage}
                    </Typography>
                )}
            </Box>
        </Container>
    );
};

export default UserSettingsForm;
