import 'package:flutter/material.dart';

class BreadCrumb extends StatelessWidget {
  final String name;
  final int level;
  final Function(int) callback;
  const BreadCrumb({
    super.key,
    required this.name,
    required this.level,
    required this.callback,
  });

  @override
  Widget build(BuildContext context) {
  
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          Ink(
            child: InkWell(
              onTap: () => callback(level),
              child: Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  decorationColor: Colors.white,
                  decoration: TextDecoration.underline,
                  fontWeight: FontWeight.w400,
                  fontSize: 18.0,
                ),
              ),
            ),
          ),
          const SizedBox(
            width: 8.0,
          ),
          const Icon(Icons.chevron_right,color: Colors.white,),
        ],
      ),
    );
  }
}
