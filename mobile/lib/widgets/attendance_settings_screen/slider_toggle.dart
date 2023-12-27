import 'package:flutter/material.dart';

class SliderToggle extends StatefulWidget {
  final Color themeColor;
  const SliderToggle({super.key, required this.themeColor});

  @override
  State<SliderToggle> createState() => _SliderToggleState();
}

class _SliderToggleState extends State<SliderToggle> {
  bool _doNotify = false;
  double _sliderValue = 0.75;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      child: Column(
        children: [
          Row(
            children: [
              const Text(
                "My Goal",
                style: TextStyle(
                  color: Color.fromRGBO(165, 165, 165, 1),
                ),
              ),
              const Spacer(),
              Slider(
                  value: _sliderValue,
                  thumbColor: widget.themeColor,
                  activeColor: widget.themeColor,
                  inactiveColor: const Color.fromRGBO(37, 37, 37, 1),
                  onChanged: (val) {
                    setState(() {
                      _sliderValue = val;
                    });
                  }),
              SizedBox(
                width: 36,
                child: Text('${(100 * _sliderValue).round()}%'),
              ),
            ],
          ),
          const Divider(
            color: Color.fromRGBO(71, 71, 71, 1),
            thickness: 0.5,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Notifications",
                style: TextStyle(
                  color: Color.fromRGBO(165, 165, 165, 1),
                ),
              ),
              Switch(
                  trackOutlineColor: MaterialStateColor.resolveWith((_) {
                    return widget.themeColor;
                  }),
                  thumbColor: MaterialStateProperty.resolveWith(
                      (Set<MaterialState> states) {
                    if (states.contains(MaterialState.selected)) {
                      return Colors.black;
                    } else {
                      return widget.themeColor;
                    }
                  }),
                  trackColor: MaterialStateProperty.resolveWith(
                      (Set<MaterialState> states) {
                    if (states.contains(MaterialState.selected)) {
                      return widget.themeColor;
                    } else {
                      return Colors.black;
                    }
                  }),
                  value: _doNotify,
                  onChanged: (state) {
                    setState(() {
                      _doNotify = state;
                    });
                  })
            ],
          )
        ],
      ),
    );
  }
}
