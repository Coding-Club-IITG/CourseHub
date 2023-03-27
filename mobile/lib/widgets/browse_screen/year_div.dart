import 'package:flutter/material.dart';

import '../../constants/themes.dart';

class YearDiv extends StatelessWidget {
  final Function(String a) callback;
  final List<String> availableYears;
  final String year;
  const YearDiv({
    super.key,
    required this.callback,
    required this.availableYears,
    required this.year,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      padding: const EdgeInsets.symmetric(vertical: 0, horizontal: 30),
      child: Row(
        children: [
          Text(
            'YEAR',
            style: Themes.theme.textTheme.labelMedium,
          ),
          const Spacer(),
          Container(
            padding:
                const EdgeInsets.symmetric(vertical: 5.0, horizontal: 10.0),
            color: Colors.white,
            child: Row(
              children: [
                Text(
                  year,
                  style: const TextStyle(
                    color: Colors.black,
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: callback,
                  itemBuilder: (context) {
                    return availableYears.map((String choice) {
                      return PopupMenuItem<String>(
                        value: choice,
                        child: Text(choice),
                      );
                    }).toList();
                  },
                  child: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
