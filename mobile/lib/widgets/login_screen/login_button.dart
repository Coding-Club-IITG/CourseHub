import 'package:flutter/material.dart';

class LoginButton extends StatelessWidget {
  const LoginButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      color: Colors.black,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset('assets/microsoft.png', height: 30),
          const SizedBox(
            width: 20,
          ),
          const Text(
            'Sign in with Microsoft',
            style: TextStyle(
                color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
          ),
        ],
      ),
    );
  }
}
