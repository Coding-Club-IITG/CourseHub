import { Box, Button, Container, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import ResponsiveAppBar from "../../components/navbar";
import axios from "axios";

const AuthScreen = () => {
    const [otpGenerated, isOtpGenerated] = useState(false);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");

    // useEffect(() => {
    //     console.log(username);
    //     console.log(password);
    // }, [password, username]);

    async function generateOtp() {
        if (!username || !password) return;
        try {
            await axios.post("http://localhost:8080/api/admin/otp", {
                username,
                password,
            });
            // setUsername("");
            setPassword("");
            isOtpGenerated(true);
        } catch (error: any) {
            console.log(error.response.data);
            alert(
                error.response.data.message ? error.response.data.message : "Something went wrong!"
            );
        }
    }
    async function login() {
        if (!otp) return;
        try {
            const resp = await axios.post("http://localhost:8080/api/admin/login", {
                username,
                otp: parseInt(otp),
            });
            console.log(resp);
            setUsername("");
            setPassword("");
            isOtpGenerated(true);
        } catch (error: any) {
            console.log(error.response.data);
            alert("Something went wrong!");
        }
    }

    return (
        <Container maxWidth="lg">
            <Typography variant="h5">CourseHub Admin Panel</Typography>
            <Typography variant="h6">Admin Login</Typography>
            <Typography variant="subtitle2">Please enter your credentials.</Typography>
            {!otpGenerated && (
                <div style={{ maxWidth: "300px" }}>
                    <Box sx={{ m: 3 }} />
                    <TextField
                        id="outlined-basic"
                        label="Username"
                        variant="outlined"
                        fullWidth
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <Box sx={{ m: 0.64 }} />
                    <TextField
                        id="outlined-basic"
                        label="Password"
                        variant="outlined"
                        fullWidth
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                    ></TextField>
                    <Box sx={{ m: 0.64 }} />
                    <Button
                        variant="contained"
                        href="#contained-buttons"
                        fullWidth
                        onClick={generateOtp}
                    >
                        Login
                    </Button>
                </div>
            )}
            {otpGenerated && (
                <div style={{ maxWidth: "300px" }}>
                    <Box sx={{ m: 3 }} />
                    <Typography variant="subtitle2">
                        Please enter the OTP sent to your registered email.
                    </Typography>
                    <TextField
                        id="outlined-basic"
                        label="OTP"
                        variant="outlined"
                        fullWidth
                        type="number"
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    <Box sx={{ m: 0.64 }} />
                    <Button variant="contained" href="#contained-buttons" fullWidth onClick={login}>
                        Submit
                    </Button>
                </div>
            )}
        </Container>
    );
};

export default AuthScreen;
