import React, { useState } from "react";
import { TextField, Button, Container, Typography, Box } from "@mui/material";

const UserSettingsForm = () => {
    const [formData, setFormData] = useState({
        company_name: "",
        username: "",
        email: ""
    });

    const [responseMessage, setResponseMessage] = useState("");

    const handleChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setResponseMessage("");

        try {
            const response = await fetch("http://localhost:8000/api/customers/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setResponseMessage(`Customer Created! Client ID: ${data.client_id}`);

                // Send confirmation to Electron
                window.electron.ipcRenderer.send("user-settings-saved", formData);
            } else {
                setResponseMessage(`Error: ${data.detail}`);
            }
        } catch (error) {
            setResponseMessage("Failed to connect to the server.");
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, p: 3, borderRadius: 2, boxShadow: 3, bgcolor: "background.paper" }}>
                <Typography variant="h5" gutterBottom>
                    User Settings
                </Typography>
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
                    <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                        Save
                    </Button>
                </form>
                {responseMessage && (
                    <Typography variant="body1" sx={{ mt: 2, color: "green" }}>
                        {responseMessage}
                    </Typography>
                )}
            </Box>
        </Container>
    );
};

export default UserSettingsForm;
