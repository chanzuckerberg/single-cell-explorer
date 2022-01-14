if $( command -v arch ) && [[ arch == 'arm' ]]; then
		brew install hdf5 llvm@11 openblas gfortran
		export HDF5_DIR=/opt/homebrew/Cellar/hdf5/1.12.1
		export PATH="/opt/homebrew/opt/llvm@11/bin:$PATH"
		export LDFLAGS="-L/opt/homebrew/opt/llvm@11/lib"
		export CPPFLAGS="-I/opt/homebrew/opt/llvm@11/include"
		export OPENBLAS=/opt/homebrew/opt/openblas/lib/
		pip install -r server/requirements-mac-m1.txt
		pip install --no-binary :all: --no-use-pep517 'numpy<1.21,>=1.17'
fi
